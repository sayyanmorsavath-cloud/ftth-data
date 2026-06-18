// ════════════════════════════════════════════════════════════════
// store/stats.js
// Query hooks ສຳລັບ Dashboard stats ແລະ ສະຖິຕິລູກຄ້າ
// ════════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase, customerFromDb } from "@/lib/supabase";
import { subDays, addDays, subMonths } from "date-fns";
import { CUSTOMERS_KEY } from "./customers";
import { PACKAGES_KEY } from "./packages";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";

// ─── helper: ວັນທີ່ມື້ນີ້ (ISO string) ──────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Summary ສຳລັບ Dashboard (ດຶງ parallel queries) ─────────
export function useGetDashboardSummary() {
  return useQuery({
    queryKey: ["stats/summary", CUSTOMERS_KEY, PACKAGES_KEY],
    queryFn: async () => {
      const now      = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const ago6m    = subMonths(now, 6).toISOString().slice(0, 10);
      const ago12m   = subMonths(now, 12).toISOString().slice(0, 10);
      const safeStr  = addDays(now, 7).toISOString().slice(0, 10);

      const [
        summaryRes, pkgCountRes,
        p1Res, p2Res, p3Res,
        totalExpRes, safeRes, soonRes, typeRes, followRes,
      ] = await Promise.all([
        // ຂໍ້ມູນ summary ຈາກ DB view
        supabase.from("v_dashboard_summary").select("*").single(),
        // ຈຳນວນ package ທັງໝົດ
        supabase.from("packages").select("id", { count: "exact", head: true }),
        // ໝົດ ≤6 ເດືອນ
        supabase.from("customers").select("id", { count: "exact", head: true })
          .gte("expiry_date", ago6m).lt("expiry_date", todayStr),
        // ໝົດ 6–12 ເດືອນ
        supabase.from("customers").select("id", { count: "exact", head: true })
          .gte("expiry_date", ago12m).lt("expiry_date", ago6m),
        // ໝົດ 12+ ເດືອນ
        supabase.from("customers").select("id", { count: "exact", head: true })
          .lt("expiry_date", ago12m),
        // ໝົດອາຍຸທັງໝົດ (ກ່ອນມື້ນີ້)
        supabase.from("customers").select("id", { count: "exact", head: true })
          .lt("expiry_date", todayStr),
        // ລູກຄ້າ "ປອດໄພ" (ຍັງ > 7 ວັນ)
        supabase.from("customers").select("id", { count: "exact", head: true })
          .gt("expiry_date", safeStr),
        // ໃກ້ໝົດ (0–7 ວັນ) — direct count ບໍ່ອີງ view
        supabase.from("customers").select("id", { count: "exact", head: true })
          .gte("expiry_date", todayStr).lte("expiry_date", safeStr),
        // ນັບຕາມປະເພດ
        supabase.from("customers").select("customer_type"),
        // follow_up_status — direct count ເພາະ view ເກົ່າອາດຂາດ columns
        supabase.from("customers").select("follow_up_status"),
      ]);

      if (summaryRes.error) throw summaryRes.error;
      const s = summaryRes.data;

      // ─── ນັບ follow_up_status ຈາກຂໍ້ມູນດິບ ──────────────────
      const followCounts = { need: 0, inprog: 0, done: 0, completed: 0 };
      for (const row of followRes.data ?? []) {
        if      (row.follow_up_status === "ຕ້ອງຕິດຕາມ")  followCounts.need++;
        else if (row.follow_up_status === "ກຳລັງຕິດຕາມ") followCounts.inprog++;
        else if (row.follow_up_status === "ຕິດຕາມແລ້ວ")  followCounts.done++;
        else if (row.follow_up_status === "ສຳເລັດ")       followCounts.completed++;
      }

      // ─── ນັບ customer_type ──────────────────────────────────
      const typeCounts = {};
      for (const row of typeRes.data ?? []) {
        const code = row.customer_type ?? "IN";
        typeCounts[code] = (typeCounts[code] ?? 0) + 1;
      }
      const typeSummary = Object.fromEntries(
        CUSTOMER_TYPES.map(t => [`type_${t.code}`, typeCounts[t.code] ?? 0])
      );

      return {
        totalCustomers:     s.total_customers     ?? 0,
        activeCustomers:    s.active_customers    ?? 0,
        safeCustomers:      safeRes.count         ?? 0,
        inactiveCustomers:  s.inactive_customers  ?? 0,
        suspendedCustomers: s.suspended_customers ?? 0,
        expiredCustomers:   totalExpRes.count     ?? 0,
        vipCustomers:       s.vip_customers       ?? 0,
        // ໃຊ້ direct count ແທນ view column (view ເກົ່າອາດຂາດ)
        expiringSoon:       soonRes.count         ?? s.expiring_soon ?? 0,
        ...typeSummary,
        followNeedAction:   followCounts.need,
        followInProgress:   followCounts.inprog,
        followDone:         followCounts.done,
        followCompleted:    followCounts.completed,
        expiredPeriod1:     p1Res.count           ?? 0,
        expiredPeriod2:     p2Res.count           ?? 0,
        expiredPeriod3:     p3Res.count           ?? 0,
        expiredRecent:      p1Res.count           ?? 0,
        expiredOld:         (p2Res.count ?? 0) + (p3Res.count ?? 0),
        totalMonthlyRevenue: 0,
        totalPackages:      pkgCountRes.count     ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

// ─── ດຶງລູກຄ້າ urgent (ໃກ້/ໝົດ ±7 ວັນ) ────────────────────
export function useGetUrgentCustomers() {
  return useQuery({
    queryKey: ["stats/urgent", CUSTOMERS_KEY],
    queryFn: async () => {
      const t = today();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .gte("expiry_date", subDays(new Date(t), 3).toISOString().slice(0, 10))
        .lte("expiry_date", addDays(new Date(t), 7).toISOString().slice(0, 10))
        .order("expiry_date")
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(customerFromDb);
    },
    staleTime: 30_000,
  });
}

// ─── ດຶງສະຖິຕິລູກຄ້າຕໍ່ package/speed ──────────────────────
// ຖ້າ v_customers_by_package ຫວ່າງ (package_id ທັງໝົດ null)
// ໃຊ້ speed field ແທນ
export function useGetCustomersByPackage() {
  return useQuery({
    queryKey: ["stats/by-package", CUSTOMERS_KEY, PACKAGES_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_customers_by_package")
        .select("*")
        .order("customer_count", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        return data.map(r => ({
          packageId:     r.package_id,
          packageName:   r.package_name,
          customerCount: r.customer_count ?? 0,
          speed:         r.speed,
          revenue:       r.revenue ?? 0,
        }));
      }

      // ─── Fallback: ຈັດກຸ່ມຕາມ speed ──────────────────────
      const { data: speedData, error: speedErr } = await supabase
        .from("customers")
        .select("speed");
      if (speedErr) throw speedErr;

      const speedMap = {};
      for (const c of speedData ?? []) {
        const key = c.speed ?? "ບໍ່ລະບຸ";
        speedMap[key] = (speedMap[key] ?? 0) + 1;
      }
      return Object.entries(speedMap)
        .map(([speed, customerCount]) => ({
          packageId:     null,
          packageName:   speed,
          customerCount,
          speed,
          revenue:       0,
        }))
        .sort((a, b) => b.customerCount - a.customerCount);
    },
    staleTime: 30_000,
  });
}

// ─── ດຶງລູກຄ້າໃກ້ໝົດ — fallback ຖ້າ view ບໍ່ມີ ─────────────
export function useGetExpiringSoon() {
  return useQuery({
    queryKey: ["stats/expiring-soon", CUSTOMERS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_expiring_soon")
        .select("*")
        .order("expiry_date");

      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") {
          // View ບໍ່ມີ — ໃຊ້ direct query ແທນ
          const t      = today();
          const soonDt = addDays(new Date(t), 7).toISOString().slice(0, 10);
          const { data: d2, error: e2 } = await supabase
            .from("customers")
            .select("*")
            .gte("expiry_date", t)
            .lte("expiry_date", soonDt)
            .order("expiry_date")
            .limit(200);
          if (e2) throw e2;
          return (d2 ?? []).map(customerFromDb);
        }
        throw error;
      }
      return (data ?? []).map(customerFromDb);
    },
    staleTime: 30_000,
  });
}

// ─── ດຶງສະຖິຕິລູກຄ້າຕໍ່ speed (ສຳລັບ Reports chart) ─────────
export async function getCustomersBySpeed() {
  const { data, error } = await supabase
    .from("customers")
    .select("speed");
  if (error) throw error;

  const total = data?.length || 1;
  const map   = {};
  for (const c of data ?? []) {
    if (c.speed) map[c.speed] = (map[c.speed] ?? 0) + 1;
  }

  return Object.entries(map)
    .map(([speed, customerCount]) => ({
      speed,
      customerCount,
      pct: Math.round((customerCount / total) * 100),
    }))
    .sort((a, b) => b.customerCount - a.customerCount);
}
