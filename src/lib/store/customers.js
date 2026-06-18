// ════════════════════════════════════════════════════════════════
// store/customers.js
// CRUD hooks ແລະ utilities ສຳລັບ Customers
// ════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, customerFromDb, customerToDb } from "@/lib/supabase";
import { genAccountId } from "./db";
import { subMonths } from "date-fns";

// ─── Query key ────────────────────────────────────────────────
export const CUSTOMERS_KEY = "/api/customers";

export function getListCustomersQueryKey(params) {
  return [CUSTOMERS_KEY, ...(params ? [params] : [])];
}

// ─── ສ້າງ Supabase query ຈາກ filter params ──────────────────
function buildQuery(params) {
  let q = supabase.from("customers").select("*", { count: "exact" });

  if (params?.status)       q = q.eq("status", params.status);
  if (params?.speed)        q = q.eq("speed", params.speed);
  if (params?.customerType) q = q.eq("customer_type", params.customerType);
  if (typeof params?.vip === "boolean") q = q.eq("vip", params.vip ? 1 : 0);
  if (params?.packageId)    q = q.eq("package_id", params.packageId);
  if (params?.expiryFrom)   q = q.gte("expiry_date", params.expiryFrom);
  if (params?.expiryTo)     q = q.lte("expiry_date", params.expiryTo);

  // ລູກຄ້າ "ປອດໄພ": active ແລະ ຍັງເຫຼືອ > 7 ວັນ
  if (params?.safe) {
    const safeDate = new Date();
    safeDate.setDate(safeDate.getDate() + 7);
    q = q.eq("status", "active").gt("expiry_date", safeDate.toISOString().slice(0, 10));
  }

  // follow-up: ຖ້າ "ຕ້ອງຕິດຕາມ" ຈຶ່ງລວມລູກຄ້າໝົດ+ບໍ່ໄດ້ mark ດ້ວຍ
  if (params?.followUpStatus) {
    const today = new Date().toISOString().slice(0, 10);
    if (params.followUpStatus === "ຕ້ອງຕິດຕາມ") {
      q = q.or(`follow_up_status.eq.ຕ້ອງຕິດຕາມ,and(follow_up_status.is.null,expiry_date.lte.${today})`);
    } else {
      q = q.eq("follow_up_status", params.followUpStatus);
    }
  }

  if (params?.city) q = q.ilike("city", `%${params.city}%`);

  // ຄົ້ນຫາຂ້າມ field ຫຼາຍຖັນ
  if (params?.search) {
    const s = params.search.replace(/'/g, "''");
    q = q.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,account_id.ilike.%${s}%,address.ilike.%${s}%,remarks.ilike.%${s}%`
    );
  }

  return q;
}

// ─── ດຶງລູກຄ້າ 1 ລາຍການ ──────────────────────────────────────
export function useGetCustomer(id) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, "single", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return customerFromDb(data);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── ດຶງລາຍຊື່ລູກຄ້າ (paginated + filtered) ─────────────────
export function useListCustomers(params) {
  const queryKey = getListCustomersQueryKey(params);
  return useQuery({
    queryKey,
    queryFn: async () => {
      const page     = params?.page     ?? 1;
      const pageSize = params?.pageSize ?? 25;
      const from     = (page - 1) * pageSize;
      const to       = from + pageSize - 1;

      const { data, count, error } = await buildQuery(params)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const mapped     = (data ?? []).map(customerFromDb);
      const total      = count ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return { data: mapped, total, page, pageSize, totalPages };
    },
    staleTime: 30_000,
  });
}

// ─── ສ້າງລູກຄ້າໃໝ່ 1 ລາຍການ ─────────────────────────────────
export function useCreateCustomer(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }) => {
      const row = customerToDb({
        ...data,
        customerType:   data.customerType   ?? "IN",
        vip:            data.vip            ?? false,
        status:         data.status         ?? "active",
        bonusMonthUsed: data.bonusMonthUsed ?? false,
      });
      const { data: inserted, error } = await supabase
        .from("customers")
        .insert(row)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("ລະຫັດລູກຄ້ານີ້ຖືກໃຊ້ແລ້ວ");
        throw error;
      }
      return customerFromDb(inserted);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      options?.mutation?.onSuccess?.(data);
    },
    onError: options?.mutation?.onError,
  });
}

// ─── Import ລູກຄ້າຈຳນວນຫຼາຍ (bulk) ──────────────────────────
// - ມີ account_id → upsert (ຂ້າມ duplicate)
// - ບໍ່ມີ account_id → insert ກົງ
// - ສົ່ງກັບ insertedIds[] ສຳລັບ batch tracking
export async function bulkCreateCustomers(dataList, { onProgress } = {}) {
  const BATCH_SIZE   = 100;
  let totalSuccess   = 0;
  let totalFailed    = 0;
  const failedIndexes = [];
  const insertedIds   = [];
  let lastError       = null;

  const rows = dataList.map(data => customerToDb({
    ...data,
    customerType:   data.customerType   ?? "IN",
    vip:            data.vip            ?? false,
    status:         data.status         ?? "active",
    bonusMonthUsed: data.bonusMonthUsed ?? false,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch        = rows.slice(i, i + BATCH_SIZE);
    const batchIndexes = dataList.slice(i, i + BATCH_SIZE).map((_, j) => i + j);

    let batchError  = null;
    const batchIds  = [];

    // insert ທຸກລາຍການໂດຍກົງ (ບໍ່ໃຊ້ ON CONFLICT)
    const { data, error } = await supabase
      .from("customers")
      .insert(batch)
      .select("id");
    if (error) batchError = error;
    else if (data) batchIds.push(...data.map(r => r.id));

    if (batchError) {
      totalFailed += batch.length;
      failedIndexes.push(...batchIndexes);
      lastError = batchError;
    } else {
      totalSuccess += batch.length;
      insertedIds.push(...batchIds);
    }

    onProgress?.({ done: totalSuccess + totalFailed, total: rows.length });
  }

  return { success: totalSuccess, failed: totalFailed, failedIndexes, lastError, insertedIds };
}

// ─── ແກ້ໄຂລູກຄ້າ 1 ລາຍການ ────────────────────────────────────
export function useUpdateCustomer(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const row = customerToDb(data);
      const { error } = await supabase
        .from("customers")
        .update(row)
        .eq("id", id);
      if (error) throw error;
      return { id, ...data };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      options?.mutation?.onSuccess?.(data);
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ລຶບລູກຄ້າ 1 ລາຍການ ──────────────────────────────────────
export function useDeleteCustomer(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ແກ້ໄຂລູກຄ້າຈຳນວນຫຼາຍ (bulk update) ────────────────────
export async function bulkUpdateCustomers(updates, { onProgress } = {}) {
  let totalSuccess    = 0;
  let totalFailed     = 0;
  const failedIndexes = [];

  for (let i = 0; i < updates.length; i++) {
    const { id, data } = updates[i];
    const row = customerToDb(data);
    const { error } = await supabase.from("customers").update(row).eq("id", id);
    if (error) {
      totalFailed++;
      failedIndexes.push(i);
    } else {
      totalSuccess++;
    }
    onProgress?.({ done: i + 1, total: updates.length });
  }

  return { success: totalSuccess, failed: totalFailed, failedIndexes };
}

// ─── ລຶບລູກຄ້າຫຼາຍ/ທັງໝົດ (batch delete) ─────────────────────
export function useDeleteManyCustomers(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, deleteAll }) => {
      if (deleteAll) {
        // ດຶງ ID ທັງໝົດກ່ອນ ແລ້ວ chunk delete
        const { data: all, error: fetchErr } = await supabase
          .from("customers")
          .select("id");
        if (fetchErr) throw fetchErr;
        const allIds = (all ?? []).map(r => r.id);
        if (allIds.length === 0) return;
        for (let i = 0; i < allIds.length; i += 100) {
          const { error } = await supabase.from("customers").delete().in("id", allIds.slice(i, i + 100));
          if (error) throw error;
        }
      } else {
        if (!ids?.length) return;
        for (let i = 0; i < ids.length; i += 100) {
          const { error } = await supabase.from("customers").delete().in("id", ids.slice(i, i + 100));
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ດຶງລູກຄ້າທັງໝົດ (ສຳລັບ Export) ──────────────────────────
export async function getAllCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    ...customerFromDb(r),
    // fallback account ID ຖ້າ DB ຍັງຫວ່າງ
    accountId: customerFromDb(r).accountId ?? genAccountId(r.id),
  }));
}

// ─── ດຶງລູກຄ້າໝົດອາຍຸຕາມໄລຍະ (ສຳລັບ Dashboard chart) ─────────
// period: 1 = ≤6 ເດືອນ, 2 = 6–12 ເດືອນ, 3 = 12+ ເດືອນ, "all" = ທັງໝົດ
export async function getExpiredCustomersByPeriod(period) {
  const now = new Date();
  let q = supabase
    .from("customers")
    .select("*")
    .eq("status", "expired")
    .order("expiry_date", { ascending: false });

  if (period !== "all") {
    if (period === 1) {
      q = q
        .gte("expiry_date", subMonths(now, 6).toISOString().slice(0, 10))
        .lt("expiry_date", now.toISOString().slice(0, 10));
    } else if (period === 2) {
      q = q
        .gte("expiry_date", subMonths(now, 12).toISOString().slice(0, 10))
        .lt("expiry_date", subMonths(now, 6).toISOString().slice(0, 10));
    } else if (period === 3) {
      q = q.lt("expiry_date", subMonths(now, 12).toISOString().slice(0, 10));
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(customerFromDb);
}
