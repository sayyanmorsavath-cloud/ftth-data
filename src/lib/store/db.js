// ════════════════════════════════════════════════════════════════
// store/db.js
// ຟັງຊັນ utility ລະດັບ database ທີ່ໃຊ້ທົ່ວທັງລະບົບ
// ════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";

// ─── ສ້າງ Account ID ຈາກ ID ຕົວເລກ (ຮູບແບບ: 81fhXXXXXX) ────────
export function genAccountId(id) {
  return `81fh${String(id).padStart(6, "0")}`;
}

// ─── ສ້າງເລກ Ticket ໃໝ່ (ຮູບແບບ: TK-YYYYMMDD-XXXX) ──────────
export function genTicketNumber() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, "0");
  const d    = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `TK-${y}${m}${d}-${rand}`;
}

// ─── ດຶງລະຫັດຜ່ານ admin ຈາກ settings table ────────────────────
export async function getAdminPassword() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_password")
    .single();
  if (error) return null;
  return data?.value ?? null;
}

// ─── ບັນທຶກລະຫັດຜ່ານ admin ໃໝ່ ──────────────────────────────────
export async function setAdminPassword(pw) {
  await supabase
    .from("settings")
    .upsert({ key: "admin_password", value: pw }, { onConflict: "key" });
}

// ─── ດຶງ permissions ຂອງ staff ຈາກ settings table ──────────────
export async function getStaffPermissions(username) {
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", `staff_perms_${username.toLowerCase()}`)
      .single();
    return data?.value ? JSON.parse(data.value) : null;
  } catch {
    return null;
  }
}

// ─── ບັນທຶກ permissions ຂອງ staff ──────────────────────────────
export async function setStaffPermissions(username, perms) {
  await supabase
    .from("settings")
    .upsert(
      { key: `staff_perms_${username.toLowerCase()}`, value: JSON.stringify(perms) },
      { onConflict: "key" }
    );
}
