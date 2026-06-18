// ════════════════════════════════════════════════════════════════
// store/dispatch.js
// CRUD hooks ສຳລັບ ການນັດໝາຍ / ສ່ົງຊ່າງ (technician_visits)
// ════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ─── Query key ────────────────────────────────────────────────
export const DISPATCH_KEY = "/api/technician_visits";

// ─── Map DB row → app object ──────────────────────────────────
function visitFromDb(row) {
  if (!row) return null;
  return {
    id:                row.id,
    ticketId:          row.ticket_id,
    customerId:        row.customer_id,
    customerName:      row.customer_name,
    customerAddress:   row.customer_address,
    customerPhone:     row.customer_phone,
    customerAccountId: row.customer_account_id,
    technician:        row.technician,
    problemType:       row.problem_type,
    scheduledDate:     row.scheduled_date,
    scheduledTime:     row.scheduled_time,
    completedAt:       row.completed_at,
    status:            row.status,
    notes:             row.notes,
    createdBy:         row.created_by,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// ─── ດຶງ visits ທັງໝົດ ─────────────────────────────────────────
export function useListVisits(params) {
  return useQuery({
    queryKey: [DISPATCH_KEY, params],
    queryFn:  async () => {
      const page     = params?.page     ?? 1;
      const pageSize = params?.pageSize ?? 30;
      const from     = (page - 1) * pageSize;
      const to       = from + pageSize - 1;

      let q = supabase
        .from("technician_visits")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (params?.status)     q = q.eq("status", params.status);
      if (params?.technician) q = q.eq("technician", params.technician);
      if (params?.date)       q = q.eq("scheduled_date", params.date);

      const { data, count, error } = await q;
      if (error) throw error;

      return {
        data:       (data ?? []).map(visitFromDb),
        total:      count ?? 0,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      };
    },
    staleTime: 30_000,
  });
}

// ─── ສ້າງ visit ໃໝ່ ───────────────────────────────────────────
export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from("technician_visits")
        .insert({
          ticket_id:           payload.ticketId           ?? null,
          customer_id:         payload.customerId         ?? null,
          customer_name:       payload.customerName       ?? "",
          customer_address:    payload.customerAddress    ?? null,
          customer_phone:      payload.customerPhone      ?? null,
          customer_account_id: payload.customerAccountId  ?? null,
          technician:          payload.technician         ?? "",
          problem_type:        payload.problemType        ?? "general",
          scheduled_date:      payload.scheduledDate      ?? null,
          scheduled_time:      payload.scheduledTime      ?? null,
          notes:               payload.notes              ?? null,
          created_by:          payload.createdBy          ?? null,
          status:              "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return visitFromDb(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DISPATCH_KEY] }),
  });
}

// ─── ອັບ​ເດດ visit ─────────────────────────────────────────────
export function useUpdateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const patch = {};
      if (payload.status !== undefined)        patch.status         = payload.status;
      if (payload.technician !== undefined)    patch.technician     = payload.technician;
      if (payload.scheduledDate !== undefined) patch.scheduled_date = payload.scheduledDate;
      if (payload.scheduledTime !== undefined) patch.scheduled_time = payload.scheduledTime;
      if (payload.notes !== undefined)         patch.notes          = payload.notes;
      if (payload.problemType !== undefined)   patch.problem_type   = payload.problemType;
      if (payload.status === "completed")      patch.completed_at   = new Date().toISOString();

      const { data, error } = await supabase
        .from("technician_visits")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return visitFromDb(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DISPATCH_KEY] }),
  });
}

// ─── ລຶບ visit ────────────────────────────────────────────────
export function useDeleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("technician_visits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DISPATCH_KEY] }),
  });
}
