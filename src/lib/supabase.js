// ════════════════════════════════════════════════════════════════
// supabase.js
// ກຳນົດ Supabase client ແລະ field mapper ສຳລັບທຸກ entity
// ════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Supabase client instance (singleton) ──────────────────────
// ຖ້າ env vars ຫາຍໄປ ໃຫ້ສ້າງ placeholder ແທນການ throw ເພື່ອປ້ອງກັນ module ລົ້ມ
let supabase;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  const notConfigured = () => Promise.reject(new Error("Supabase ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ — ກະລຸນາກຳນົດ VITE_SUPABASE_URL ແລະ VITE_SUPABASE_ANON_KEY"));
  supabase = {
    from: () => ({
      select: notConfigured, insert: notConfigured, update: notConfigured,
      upsert: notConfigured, delete: notConfigured, eq: () => ({ select: notConfigured }),
      single: notConfigured,
    }),
    auth: { getSession: notConfigured, signIn: notConfigured, signOut: notConfigured },
  };
  if (typeof window !== "undefined") {
    console.error("[supabase] VITE_SUPABASE_URL ຫຼື VITE_SUPABASE_ANON_KEY ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ");
  }
}
export { supabase };

// ════════════════════════════════════════════════════════════════
// Customer field mappers (DB snake_case ↔ JS camelCase)
// ════════════════════════════════════════════════════════════════

// ─── DB row → JS object ─────────────────────────────────────────
export function customerFromDb(row) {
  if (!row) return null;
  const today     = new Date().toISOString().slice(0, 10);
  const isExpired = row.expiry_date && row.expiry_date <= today;
  // ຖ້າ follow_up_status ວ່າງ ແລະ ໝົດອາຍຸ → ໃຊ້ "ຕ້ອງຕິດຕາມ" ອັດຕະໂນມັດ
  const followUpStatus = row.follow_up_status || (isExpired ? "ຕ້ອງຕິດຕາມ" : "");
  return {
    id:               row.id,
    accountId:        row.account_id,
    name:             row.name,
    phone:            row.phone,
    address:          row.address,
    city:             row.city,
    customerType:     row.customer_type,
    vip:              row.vip,
    packageId:        row.package_id,
    speed:            row.speed,
    status:           row.status,
    installationDate: row.installation_date,
    startDate:        row.start_date,
    expiryDate:       row.expiry_date,
    bonusMonthUsed:   row.bonus_month_used,
    followUpStatus,
    followUpPerson:   row.follow_up_person,
    remarks:          row.remarks,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

// ─── JS object → DB row (ສ່ງສະເພາະ field ທີ່ defined) ────────────
export function customerToDb(data) {
  const row = {};
  if (data.accountId        !== undefined) row.account_id        = data.accountId || null;
  if (data.name             !== undefined) row.name              = data.name;
  if (data.phone            !== undefined) row.phone             = data.phone;
  if (data.address          !== undefined) row.address           = data.address || null;
  if (data.city             !== undefined) row.city              = data.city || null;
  if (data.customerType     !== undefined) row.customer_type     = data.customerType;
  if (data.vip              !== undefined) row.vip               = data.vip ? 1 : 0;
  if (data.packageId        !== undefined) row.package_id        = (data.packageId != null && data.packageId !== false && data.packageId !== "") ? Number(data.packageId) : null;
  if (data.speed            !== undefined) row.speed             = data.speed || null;
  if (data.status           !== undefined) row.status            = data.status;
  if (data.installationDate !== undefined) row.installation_date = data.installationDate || null;
  if (data.startDate        !== undefined) row.start_date        = data.startDate || null;
  if (data.expiryDate       !== undefined) row.expiry_date       = data.expiryDate;
  if (data.bonusMonthUsed   !== undefined) row.bonus_month_used  = data.bonusMonthUsed ? 1 : 0;
  if (data.followUpStatus   !== undefined) row.follow_up_status  = data.followUpStatus || null;
  if (data.followUpPerson   !== undefined) row.follow_up_person  = data.followUpPerson || null;
  if (data.remarks          !== undefined) row.remarks           = data.remarks || null;
  return row;
}

// ════════════════════════════════════════════════════════════════
// Ticket field mappers
// ════════════════════════════════════════════════════════════════

// ─── DB row → JS object ─────────────────────────────────────────
export function ticketFromDb(row) {
  if (!row) return null;
  return {
    id:                row.id,
    ticketNumber:      row.ticket_number,
    customerId:        row.customer_id,
    customerName:      row.customer_name,
    customerPhone:     row.customer_phone,
    customerAccountId: row.customer_account_id,
    customerAddress:   row.customer_address,
    customerSpeed:     row.customer_speed,
    customerStatus:    row.customer_status,
    customerExpiry:    row.customer_expiry,
    category:          row.category,
    priority:          row.priority,
    description:       row.description,
    contactMethod:     row.contact_method,
    reportedAt:        row.reported_at,
    dispatchedAt:      row.dispatched_at,
    status:            row.status,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// ─── JS object → DB row ─────────────────────────────────────────
export function ticketToDb(data) {
  const row = {};
  if (data.ticketNumber      !== undefined) row.ticket_number       = data.ticketNumber;
  if (data.customerId        !== undefined) row.customer_id         = data.customerId || null;
  if (data.customerName      !== undefined) row.customer_name       = data.customerName;
  if (data.customerPhone     !== undefined) row.customer_phone      = data.customerPhone || null;
  if (data.customerAccountId !== undefined) row.customer_account_id = data.customerAccountId || null;
  if (data.customerAddress   !== undefined) row.customer_address    = data.customerAddress || null;
  if (data.customerSpeed     !== undefined) row.customer_speed      = data.customerSpeed || null;
  if (data.customerStatus    !== undefined) row.customer_status     = data.customerStatus || null;
  if (data.customerExpiry    !== undefined) row.customer_expiry     = data.customerExpiry || null;
  if (data.category          !== undefined) row.category            = data.category;
  if (data.priority          !== undefined) row.priority            = data.priority;
  if (data.description       !== undefined) row.description         = data.description;
  if (data.contactMethod     !== undefined) row.contact_method      = data.contactMethod || null;
  if (data.reportedAt        !== undefined) row.reported_at         = data.reportedAt || null;
  if (data.dispatchedAt      !== undefined) row.dispatched_at       = data.dispatchedAt || null;
  if (data.status            !== undefined) row.status              = data.status;
  return row;
}

// ════════════════════════════════════════════════════════════════
// Staff field mappers
// ════════════════════════════════════════════════════════════════

// ─── DB row → JS object ─────────────────────────────────────────
export function staffFromDb(row) {
  if (!row) return null;
  return {
    id:          row.id,
    username:    row.username,
    password:    row.password_hash,
    role:        row.role,
    displayName: row.display_name,
    phone:       row.phone,
    createdAt:   row.created_at,
  };
}

// ─── JS object → DB row ─────────────────────────────────────────
export function staffToDb(data) {
  const row = {};
  if (data.username    !== undefined) row.username      = data.username.toLowerCase();
  if (data.password    !== undefined) row.password_hash = data.password;
  if (data.role        !== undefined) row.role          = data.role;
  if (data.displayName !== undefined) row.display_name  = data.displayName;
  if (data.phone       !== undefined) row.phone         = data.phone || null;
  return row;
}
