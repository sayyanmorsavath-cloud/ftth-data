// ════════════════════════════════════════════════════════════════
// store/tickets.js
// CRUD hooks ແລະ utilities ສຳລັບ Tickets
// ════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, ticketFromDb, ticketToDb } from "@/lib/supabase";
import { genTicketNumber } from "./db";

// ─── Query key ສຳລັບ TanStack Query cache ──────────────────────
export const TICKETS_KEY = "/api/tickets";

export function getListTicketsQueryKey() {
  return [TICKETS_KEY];
}

// ─── ດຶງລາຍຊື່ ticket ທັງໝົດ (ຮຽງຈາກໃໝ່ → ເກົ່າ) ───────────────
export function useListTickets() {
  return useQuery({
    queryKey: [TICKETS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(ticketFromDb);
    },
    staleTime: 30_000,
  });
}

// ─── ເພີ່ມ dispatchedAt ແບບ random (0–120 ວິ ຫຼັງ reported) ───
function addRandomDispatch(data) {
  if (data.dispatchedAt) return data;
  const base       = data.reportedAt ? new Date(data.reportedAt) : new Date();
  const randomSec  = Math.floor(Math.random() * 121);
  const dispatched = new Date(base.getTime() + randomSec * 1000);
  return { ...data, dispatchedAt: dispatched.toISOString() };
}

// ─── ສ້າງ ticket ໃໝ່ 1 ລາຍການ ──────────────────────────────────
export function useCreateTicket(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }) => {
      const row = ticketToDb({
        ...addRandomDispatch(data),
        ticketNumber: genTicketNumber(),
        status: "open",
      });
      const { data: inserted, error } = await supabase
        .from("tickets")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return ticketFromDb(inserted);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
      options?.mutation?.onSuccess?.(data);
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ແກ້ໄຂ ticket ──────────────────────────────────────────────
export function useUpdateTicket(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const row = ticketToDb(data);
      const { data: updated, error } = await supabase
        .from("tickets")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!updated) throw new Error("ບໍ່ພົບ ticket");
      return ticketFromDb(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}

// ─── Import tickets ຈຳນວນຫຼາຍ (bulk insert) ────────────────────
// ສ້າງ ticket number ອັດຕະໂນມັດຕາມລຳດັບ index
export async function bulkCreateTickets(rows) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, "0");
  const d    = String(now.getDate()).padStart(2, "0");
  const base = now.getTime();

  const { data, error } = await supabase
    .from("tickets")
    .insert(rows.map((r, i) => {
      const unique       = String(base + i).slice(-6);
      const ticketNumber = `TK-${y}${m}${d}-${unique}`;
      return ticketToDb({ ...addRandomDispatch(r), ticketNumber, status: r.status || "open" });
    }))
    .select();

  if (error) throw error;
  return (data ?? []).map(ticketFromDb);
}

// ─── ລຶບ ticket ດ່ຽວ ────────────────────────────────────────────
export function useDeleteTicket(options) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] });
      options?.mutation?.onSuccess?.();
    },
    onError: options?.mutation?.onError,
  });
}

// ─── ລຶບ tickets ຈຳນວນຫຼາຍ (ໃຊ້ຕອນລຶບ batch) ─────────────────
export async function bulkDeleteAllTickets(ids) {
  if (!ids?.length) return;
  const { error } = await supabase.from("tickets").delete().in("id", ids);
  if (error) throw error;
}
