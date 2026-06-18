// ════════════════════════════════════════════════════════════════
// telegram.js
// ສົ່ງ OTP ແລະ Daily Digest ຜ່ານ Telegram Bot
// ─── env vars: VITE_TELEGRAM_BOT_TOKEN, VITE_TELEGRAM_ADMIN_CHAT_ID
// ════════════════════════════════════════════════════════════════

const BOT_TOKEN     = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID;

// ─── ສ້າງ OTP 6 ຕົວເລກ ──────────────────────────────────────────
export function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── ສ່ວນກາງ: ສົ່ງ message ─────────────────────────────────────
async function sendTelegramMessage(text, chatId) {
  const token = BOT_TOKEN;
  const chat  = chatId || ADMIN_CHAT_ID;
  if (!token || !chat) {
    console.error("[Telegram] Bot token ຫຼື Chat ID ບໍ່ໄດ້ຕັ້ງ");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
      }
    );
    const data = await res.json();
    if (!data.ok) console.error("[Telegram] API error:", data.description);
    return data.ok === true;
  } catch (e) {
    console.error("[Telegram] ສົ່ງ message ລົ້ມເຫລວ:", e);
    return false;
  }
}

// ─── ສົ່ງ OTP ໄປຫາ Telegram admin chat ──────────────────────────
export async function sendOTPToTelegram(otp) {
  const text = `🔐 *LTC FTTH Tracker - OTP Login*\n\nລະຫັດ OTP ຂອງທ່ານ: *${otp}*\n\n⏱ ໃຊ້ໄດ້ພາຍໃນ 5 ນາທີ\n_ຫ້າມແຊຣ໌ລະຫັດນີ້ໃຫ້ໃຜ_`;
  return sendTelegramMessage(text);
}

// ─── ສົ່ງ Daily Digest (ສະຫຼຸບລູກຄ້າໃກ້ໝົດ/ໝົດ) ─────────────────
// customers: array ຂອງ customer objects (camelCase)
export async function sendDailyDigest(customers) {
  const now     = new Date();
  const today   = now.toISOString().slice(0, 10);

  const expToday  = customers.filter(c => c.expiryDate === today);
  const exp3days  = customers.filter(c => {
    if (!c.expiryDate) return false;
    const d = Math.ceil((new Date(c.expiryDate) - now) / 86400000);
    return d > 0 && d <= 3;
  });
  const exp7days  = customers.filter(c => {
    if (!c.expiryDate) return false;
    const d = Math.ceil((new Date(c.expiryDate) - now) / 86400000);
    return d > 3 && d <= 7;
  });
  const expiredVip = customers.filter(c => c.vip && c.status === "expired");

  function listLines(arr, limit = 5) {
    if (arr.length === 0) return "  _ບໍ່ມີ_";
    const lines = arr.slice(0, limit).map(c => `  • ${c.name} (${c.phone ?? "—"})`);
    if (arr.length > limit) lines.push(`  _...ແລະ ${arr.length - limit} ລາຍອື່ນ_`);
    return lines.join("\n");
  }

  const dateStr = now.toLocaleDateString("lo-LA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const text = [
    `📊 *LTC FTTH — ສະຫຼຸບປະຈຳວັນ*`,
    `📅 ${dateStr}`,
    ``,
    `🔴 *ໝົດສັນຍາວັນນີ້ (${expToday.length} ລາຍ)*`,
    listLines(expToday),
    ``,
    `🟠 *ໝົດສັນຍາໃນ 1-3 ວັນ (${exp3days.length} ລາຍ)*`,
    listLines(exp3days),
    ``,
    `🟡 *ໝົດສັນຍາໃນ 4-7 ວັນ (${exp7days.length} ລາຍ)*`,
    listLines(exp7days),
    ``,
    `⭐ *VIP ໝົດສັນຍາ (${expiredVip.length} ລາຍ)*`,
    listLines(expiredVip),
    ``,
    `_ສົ່ງໂດຍ LTC FTTH Tracker_`,
  ].join("\n");

  return sendTelegramMessage(text);
}

// ─── ສົ່ງ Renewal Notification ──────────────────────────────────
export async function sendRenewalNotification(customerName, paidMonths, amount, recordedBy) {
  const text = [
    `✅ *ຕໍ່ສັນຍາສຳເລັດ*`,
    ``,
    `👤 ລູກຄ້າ: *${customerName}*`,
    `📆 ໄລຍະ: ${paidMonths} ເດືອນ`,
    `💰 ຈຳນວນ: ${amount > 0 ? `${amount.toLocaleString()} ກີບ` : "—"}`,
    `👤 ຮັບຊຳລະ: ${recordedBy ?? "—"}`,
  ].join("\n");
  return sendTelegramMessage(text);
}
