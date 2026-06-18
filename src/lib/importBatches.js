// ════════════════════════════════════════════════════════════════
// importBatches.js
// ຈັດການໂຟລເດີ (batch) ສຳລັບ import ticket ຈາກ LTC
// ເກັບຂໍ້ມູນໃນ Supabase — ເຫັນໄດ້ທຸກເຄື່ອງ
// ════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";

// ─── ແປງ DB row → JS object ────────────────────────────────────
function fromDb(r) {
  return {
    id:         r.id,
    name:       r.name,
    fileName:   r.file_name ?? "",
    importedAt: r.imported_at,
    count:      r.count,
    ticketIds:  Array.isArray(r.item_ids) ? r.item_ids : [],
    type:       r.file_name?.toUpperCase().includes("LTC") ? "LTC" : "other",
  };
}

// ─── ດຶງລາຍຊື່ batch ທັງໝົດ ────────────────────────────────────
export async function getBatches() {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("type", "ticket")
    .order("imported_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDb);
}

// ─── ເພີ່ມ batch ໃໝ່ ───────────────────────────────────────────
export async function saveBatch(batch) {
  const { error } = await supabase
    .from("import_batches")
    .insert({
      id:          batch.id,
      type:        "ticket",
      name:        batch.name,
      file_name:   batch.fileName ?? "",
      imported_at: batch.importedAt ?? new Date().toISOString(),
      count:       batch.count,
      item_ids:    batch.ticketIds ?? [],
    });
  if (error) throw error;
}

// ─── ປ່ຽນຊື່ batch ──────────────────────────────────────────────
export async function updateBatchName(id, name) {
  const { error } = await supabase
    .from("import_batches")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

// ─── ລຶບ batch ─────────────────────────────────────────────────
export async function removeBatch(id) {
  const { error } = await supabase
    .from("import_batches")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
