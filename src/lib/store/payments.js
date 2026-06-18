// ════════════════════════════════════════════════════════════════
// store/payments.js
// CRUD hooks ສຳລັບ ປະຫວັດການຊຳລະເງິນ (payments)
// ════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Query keys ───────────────────────────────────────────────
export const PAYMENTS_KEY = "/api/payments";

// ─── Map DB row → app object ──────────────────────────────────
function paymentFromDb(row) {
  if (!row) return null;
  return {
    id:               row.id,
    customerId:       row.customer_id,
    customerName:     row.customer_name,
    customerAccountId: row.customer_account_id,
    amount:           Number(row.amount ?? 0),
    paidMonths:       row.paid_months,
    bonusMonths:      row.bonus_months,
    paymentMethod:    row.payment_method,
    startDate:        row.start_date,
    expiryDate:       row.expiry_date,
    notes:            row.notes,
    recordedBy:       row.recorded_by,
    createdAt:        row.created_at,
  };
}

// ─── ດຶງ payments ຂອງລູກຄ້າ 1 ລາຍ ────────────────────────────
export function useListCustomerPayments(customerId) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, "customer", customerId],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(paymentFromDb);
    },
    enabled:   !!customerId,
    staleTime: 30_000,
  });
}

// ─── ດຶງ payments ທັງໝົດ (ສຳລັບ StaffStats) ──────────────────
export function useListAllPayments(params) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, "all", params],
    queryFn:  async () => {
      let q = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (params?.from) q = q.gte("created_at", params.from);
      if (params?.to)   q = q.lte("created_at", params.to);
      if (params?.recordedBy) q = q.eq("recorded_by", params.recordedBy);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(paymentFromDb);
    },
    staleTime: 60_000,
  });
}

// ─── ສ້າງ payment ໃໝ່ ─────────────────────────────────────────
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          customer_id:         payload.customerId   ?? null,
          customer_name:       payload.customerName ?? "",
          customer_account_id: payload.customerAccountId ?? null,
          amount:              payload.amount        ?? 0,
          paid_months:         payload.paidMonths    ?? 1,
          bonus_months:        payload.bonusMonths   ?? 0,
          payment_method:      payload.paymentMethod ?? "cash",
          start_date:          payload.startDate     ?? null,
          expiry_date:         payload.expiryDate    ?? null,
          notes:               payload.notes         ?? null,
          recorded_by:         payload.recordedBy    ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return paymentFromDb(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
    },
  });
}

// ─── ລຶບ payment 1 ລາຍ (admin only) ──────────────────────────
export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
    },
  });
}
