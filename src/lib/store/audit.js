// ════════════════════════════════════════════════════════════════
// store/audit.js
// ຟັງຊັນສຳລັບ Audit Log — ບັນທຶກ action ສຳຄັນ
// ════════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Query key ────────────────────────────────────────────────
export const AUDIT_KEY = "/api/audit_logs";

// ─── ເພີ່ມ audit log entry (fire-and-forget) ──────────────────
// ໃຊ້ໄດ້ໂດຍກົງ — ບໍ່ຕ້ອງ await ຖ້າບໍ່ຕ້ອງການ error handling
export async function addAuditLog({ action, entityType, entityId, entityName, details, performedBy }) {
  try {
    await supabase.from("audit_logs").insert({
      action,
      entity_type:  entityType  ?? "customer",
      entity_id:    entityId    ?? null,
      entity_name:  entityName  ?? null,
      details:      details     ?? null,
      performed_by: performedBy ?? null,
    });
  } catch (e) {
    console.warn("[AuditLog] ບໍ່ສາມາດບັນທຶກໄດ້:", e);
  }
}

// ─── ດຶງ audit logs (paginated) ───────────────────────────────
export function useListAuditLogs({ page = 1, pageSize = 30, entityType, action, performedBy } = {}) {
  return useQuery({
    queryKey: [AUDIT_KEY, { page, pageSize, entityType, action, performedBy }],
    queryFn:  async () => {
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (entityType)  q = q.eq("entity_type", entityType);
      if (action)      q = q.eq("action", action);
      if (performedBy) q = q.eq("performed_by", performedBy);

      const { data, count, error } = await q;
      if (error) throw error;

      return {
        data:       (data ?? []).map(logFromDb),
        total:      count ?? 0,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      };
    },
    staleTime: 30_000,
  });
}

// ─── Map DB row → app object ──────────────────────────────────
function logFromDb(row) {
  return {
    id:          row.id,
    action:      row.action,
    entityType:  row.entity_type,
    entityId:    row.entity_id,
    entityName:  row.entity_name,
    details:     row.details,
    performedBy: row.performed_by,
    createdAt:   row.created_at,
  };
}
