import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListTickets, useCreateTicket, useUpdateTicket, useDeleteTicket,
  useListCustomers, bulkCreateTickets, bulkDeleteAllTickets,
} from "@/lib/store";
import { saveBatch } from "@/lib/importBatches";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import {
  AlertCircle, Plus, X, Search, CheckCircle2, Clock,
  Trash2, Wifi, Phone, RefreshCw,
  Wrench, Zap, HelpCircle, TicketCheck,
  Download, CalendarDays, BarChart2, List,
  AlertTriangle,
  Upload, FileSpreadsheet, FileDown, ShieldAlert, ImagePlus,
  Pencil, Save,
} from "lucide-react";
import { format, parseISO, parse, isValid } from "date-fns";
import { DateInput, TimeInput } from "@/components/DateInput";
import ExcelJS from "exceljs";

const RED_HEX   = "C62828";
const RED_LIGHT = "FDECEA";
const AMBER     = "FFF8E1";
const GREEN_LIGHT = "E8F5E9";
const BLUE_LIGHT  = "E3F2FD";
const GREY  = "F5F5F5";
const WHITE = "FFFFFF";

const CATEGORIES = [
  { value: "ອິນເຕີເນັດຊ້າ", icon: Zap, color: "text-amber-500" },
  { value: "ອິນເຕີເນັດຂາດ", icon: Wifi, color: "text-red-500" },
  { value: "ອຸປະກອນຂັດຂ້ອງ", icon: Wrench, color: "text-orange-500" },
  { value: "ຂໍຕໍ່ອາຍຸ", icon: RefreshCw, color: "text-blue-500" },
  { value: "ອື່ນໆ", icon: HelpCircle, color: "text-muted-foreground" },
];

const PRIORITIES = [
  { value: "urgent", label: "ດ່ວນ", cls: "bg-red-100 text-red-700 border-red-200" },
  { value: "high",   label: "ສູງ",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "normal", label: "ປົກກະຕິ", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "low",    label: "ຕ່ຳ",  cls: "bg-muted text-muted-foreground border-border" },
];

const TICKET_STATUS = {
  open:        { label: "Queued",      cls: "bg-blue-100 text-blue-700 border-blue-200",           dot: "bg-blue-500" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
  pending:     { label: "Pending",     cls: "bg-purple-100 text-purple-700 border-purple-200",     dot: "bg-purple-500" },
  resolved:    { label: "Resolved",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  closed:      { label: "Closed",      cls: "bg-muted text-muted-foreground border-border",        dot: "bg-muted-foreground" },
};

const CONTACT_METHODS = ["ໂທລະສັບ", "WhatsApp", "ມາດ້ວຍຕົນເອງ", "ອື່ນໆ"];

function PriorityBadge({ priority }) {
  const p = PRIORITIES.find(x => x.value === priority) ?? PRIORITIES[2];
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${p.cls}`}>{p.label}</span>;
}

function StatusBadge({ status }) {
  const s = TICKET_STATUS[status] ?? TICKET_STATUS.open;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, iconBg, textColor }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}

function CustomerPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const { data } = useListCustomers({ search: search || undefined, pageSize: 20 });
  const customers = data?.data ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">ເລືອກລູກຄ້າ</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ຄົ້ນຫາລູກຄ້າ..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]" />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {customers.length === 0
            ? <p className="text-center text-sm text-muted-foreground py-6">ບໍ່ພົບລູກຄ້າ</p>
            : customers.map(c => (
              <button key={c.id} onClick={() => onSelect(c)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
                <div className="font-semibold text-foreground text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.phone} · {c.speed} · {c.accountId}</div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function FieldErr({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-[11px] mt-1 font-medium flex items-center gap-1"><AlertCircle size={10} />{msg}</p>;
}

function parseQuickPaste(text) {
  const lines = text.split(/\r?\n/);
  const get = (prefix) => {
    const line = lines.find(l => l.trimStart().startsWith(prefix));
    return line ? line.slice(line.indexOf(prefix) + prefix.length).trim() : "";
  };
  return {
    name:      get("ຊື່ :"),
    phone:     get("ເບີໂທຕິດຕໍ່ :"),
    accountId: get("ເບີຕິດຄັດ :"),
    address:   get("ທີ່ຢູ່ :"),
    detail:    get("ລາຍລະອຽດ :"),
  };
}

function CreateModal({ onClose, onCreated }) {
  const [showPicker, setShowPicker] = useState(false);
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState("");
  const [customer, setCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const _now = new Date();
  const _timeNow = _now.toTimeString().slice(0, 5);
  const [form, setForm] = useState({
    category: "ອິນເຕີເນັດຊ້າ",
    priority: "normal",
    description: "",
    contactMethod: "ໂທລະສັບ",
    reportedAt: _now.toISOString().slice(0, 10),
    reportedAtTime: _timeNow,
    createdAtTime: _timeNow,
    dispatchedAt: "",
    dispatchedAtTime: "",
    manualName: "",
    manualPhone: "",
    manualAddress: "",
    manualAccountId: "",
    manualSpeed: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);
  const createTicket = useCreateTicket();
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleQuickFill = () => {
    const parsed = parseQuickPaste(quickPasteText);
    if (!parsed.name && !parsed.phone && !parsed.accountId && !parsed.address && !parsed.detail) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    setCustomer(null);
    setErrors({});
    setForm(f => ({
      ...f,
      manualName:      parsed.name      || f.manualName,
      manualPhone:     parsed.phone     || f.manualPhone,
      manualAccountId: parsed.accountId || f.manualAccountId,
      manualAddress:   parsed.address   || f.manualAddress,
      description:     parsed.detail    || f.description,
      reportedAt:      dateStr,
      reportedAtTime:  timeStr,
      createdAtTime:   timeStr,
    }));
    setQuickPasteText("");
    setShowQuickPaste(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const sendTelegramAlert = async (ticketData, imgFile) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) return;
    const msg =
      `⚠️⚠️ ແຈ້ງຕິດຄັດ ⚠️⚠️\n` +
      `ຊື່ : ${ticketData.customerName || "-"}\n` +
      `ທີ່ຢູ່ : ${ticketData.customerAddress || "-"}\n` +
      `ເບີໂທຕິດຕໍ່ : ${ticketData.customerPhone || "-"}\n` +
      `ເບີຕິດຄັດ : ${ticketData.customerAccountId || "-"}\n` +
      `ຄວາມໄວ : ${ticketData.customerSpeed || "-"}\n` +
      `ໝວດຫມູ່ : ${ticketData.category || "-"}\n` +
      `ລາຍລະອຽດ : ${ticketData.description || "-"}`;
    try {
      if (imgFile) {
        const fd = new FormData();
        fd.append("chat_id", chatId);
        fd.append("photo", imgFile);
        fd.append("caption", msg);
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: fd });
      } else {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg }),
        });
      }
    } catch {}
  };

  const validate = () => {
    const e = {};
    const name = customer ? customer.name : form.manualName.trim();
    if (!name) e.manualName = "ກະລຸນາໃສ່ຊື່ລູກຄ້າ";
    const phone = customer ? customer.phone : form.manualPhone.trim();
    if (!phone) e.manualPhone = "ກະລຸນາໃສ່ເບີໂທ";
    if (!form.description.trim()) e.description = "ກະລຸນາໃສ່ລາຍລະອຽດ";
    if (!form.reportedAt) e.reportedAt = "ກະລຸນາໃສ່ວັນທີ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const reportedAtFull = form.reportedAt
      ? `${form.reportedAt}T${form.reportedAtTime || "00:00"}:00`
      : null;
    const dispatchedAtFull = form.dispatchedAt
      ? `${form.dispatchedAt}T${form.dispatchedAtTime || "00:00"}:00`
      : null;
    const base = { ...form, reportedAt: reportedAtFull, dispatchedAt: dispatchedAtFull };
    const ticketData = customer ? {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAccountId: customer.accountId,
      customerAddress: customer.address,
      customerSpeed: customer.speed,
      customerStatus: customer.status,
      customerExpiry: customer.expiryDate,
      ...base,
    } : {
      customerId: null,
      customerName: form.manualName || null,
      customerPhone: form.manualPhone || null,
      customerAccountId: form.manualAccountId || null,
      customerAddress: form.manualAddress || null,
      customerSpeed: form.manualSpeed || null,
      customerStatus: null,
      customerExpiry: null,
      ...base,
    };
    createTicket.mutate({ data: ticketData }, {
      onSuccess: () => { sendTelegramAlert(ticketData, imageFile); onCreated(); onClose(); },
    });
  };

  if (showPicker) return <CustomerPicker onSelect={c => { setCustomer(c); setShowPicker(false); setErrors({}); }} onClose={() => setShowPicker(false)} />;

  const inputCls = (field) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] bg-background transition-colors ${
      errors[field] ? "border-red-400 bg-red-50/50" : "border-border"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-3 overflow-y-auto py-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg my-4 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border"
          style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,44%) 100%)" }}>
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Plus size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-extrabold text-white text-sm">ສ້າງ Ticket ໃຫມ່</h2>
            <p className="text-white/60 text-[11px] mt-0.5">ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບຖ້ວນ</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Quick Paste ── */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQuickPaste(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
            >
              <span className="text-base leading-none">⚡</span>
              <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-widest flex-1">ວາງຂໍ້ຄວາມດ່ວນ</span>
              <span className="text-[10px] text-amber-500 font-medium">{showQuickPaste ? "▲ ປິດ" : "▼ ເປີດ"}</span>
            </button>
            {showQuickPaste && (
              <div className="px-4 pb-4 space-y-2 border-t border-amber-200">
                <p className="text-[10px] text-amber-600 pt-2">ວາງຂໍ້ຄວາມຈາກ Telegram ໄດ້ເລີຍ — ລະບົບຈະຕື່ມຂໍ້ມູນໃຫ້ອັດຕະໂນມັດ</p>
                <textarea
                  autoFocus
                  rows={7}
                  value={quickPasteText}
                  onChange={e => setQuickPasteText(e.target.value)}
                  placeholder={`⚠️⚠️ ແຈ້ງຕິດຄັດ ⚠️⚠️\nຊື່ : ນາງ ຫຼ້າ\nເບີໂທຕິດຕໍ່ : 2056418094\nເບີຕິດຄັດ : 81fh211054\nທີ່ຢູ່ : ດອນກ້ວ\nລາຍລະອຽດ : ໂມເດັມຂຶ້ນສີແດງ`}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-none font-mono text-xs leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleQuickFill}
                  disabled={!quickPasteText.trim()}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(38,90%,40%) 0%, hsl(38,90%,55%) 100%)" }}
                >
                  <span className="text-base leading-none">⚡</span> ໃສ່ອັດຕະໂນມັດ
                </button>
              </div>
            )}
          </div>

          {/* ── Section 1: Customer ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-[hsl(0,66%,42%)]" />
              <span className="text-[11px] font-extrabold text-[hsl(0,66%,42%)] uppercase tracking-widest">ຂໍ້ມູນລູກຄ້າ</span>
              <div className="flex-1 h-px bg-red-100" />
              <button onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[hsl(0,66%,42%)] bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors">
                <Search size={11} /> {customer ? "ປ່ຽນລູກຄ້າ" : "ຄົ້ນຫາລູກຄ້າ"}
              </button>
            </div>

            {customer ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                  {customer.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-emerald-800 text-sm">{customer.name}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">
                    {[customer.phone, customer.speed, customer.accountId, customer.address].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button onClick={() => { setCustomer(null); setErrors({}); }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 bg-white rounded-lg px-2 py-1 hover:bg-red-50 transition-all">
                  ລຶບ
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      ຊື່ລູກຄ້າ <span className="text-red-500">*</span>
                    </label>
                    <input value={form.manualName} onChange={e => set("manualName", e.target.value)}
                      placeholder="ຊື່ລູກຄ້າ..."
                      className={inputCls("manualName")} />
                    <FieldErr msg={errors.manualName} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      ເບີໂທ <span className="text-red-500">*</span>
                    </label>
                    <input value={form.manualPhone} onChange={e => set("manualPhone", e.target.value)}
                      placeholder="020xxxxxxxx"
                      className={inputCls("manualPhone")} />
                    <FieldErr msg={errors.manualPhone} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ທີ່ຢູ່</label>
                    <input value={form.manualAddress} onChange={e => set("manualAddress", e.target.value)}
                      placeholder="ບ້ານ, ເມືອງ..."
                      className={inputCls("manualAddress")} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເບີ Account</label>
                    <input value={form.manualAccountId} onChange={e => set("manualAccountId", e.target.value)}
                      placeholder="81fhxxxxxx"
                      className={inputCls("manualAccountId")} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Problem Info ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" />
              <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest">ຂໍ້ມູນບັນຫາ</span>
              <div className="flex-1 h-px bg-amber-100" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ໝວດຫມູ່ <span className="text-red-500">*</span></label>
                  <select value={form.category} onChange={e => set("category", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ຄວາມຮີບດ່ວນ <span className="text-red-500">*</span></label>
                  <select value={form.priority} onChange={e => set("priority", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  ລາຍລະອຽດ <span className="text-red-500">*</span>
                </label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                  placeholder="ອະທິບາຍບັນຫາລະອຽດ..."
                  className={`${inputCls("description")} resize-none`} />
                <FieldErr msg={errors.description} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Contact & Dates ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest">ຊ່ອງທາງ &amp; ວັນທີ</span>
              <div className="flex-1 h-px bg-blue-100" />
            </div>
            <div className="space-y-3">
              {/* ── ເວລາສ້າງ Ticket ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ຊ່ອງທາງຕິດຕໍ່ <span className="text-red-500">*</span></label>
                  <select value={form.contactMethod} onChange={e => set("contactMethod", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເວລາສ້າງ Ticket</label>
                  <TimeInput value={form.createdAtTime} onChange={v => set("createdAtTime", v)} />
                </div>
              </div>
              {/* ── ວັນທີ & ເວລາລູກຄ້າແຈ້ງ ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ວັນທີລູກຄ້າແຈ້ງ <span className="text-red-500">*</span>
                  </label>
                  <DateInput isoMode value={form.reportedAt} onChange={v => set("reportedAt", v)} />
                  <FieldErr msg={errors.reportedAt} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ເວລາລູກຄ້າແຈ້ງ <span className="text-red-500">*</span>
                  </label>
                  <TimeInput value={form.reportedAtTime} onChange={v => set("reportedAtTime", v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ວັນທີສົ່ງທີມ <span className="text-slate-400 font-normal normal-case">(ທາງເລືອກ)</span>
                  </label>
                  <DateInput isoMode value={form.dispatchedAt} onChange={v => set("dispatchedAt", v)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເວລາສົ່ງທີມ</label>
                  <TimeInput value={form.dispatchedAtTime} onChange={v => set("dispatchedAtTime", v)} disabled={!form.dispatchedAt} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Image ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-violet-500" />
              <span className="text-[11px] font-extrabold text-violet-600 uppercase tracking-widest">ຮູບພາບ</span>
              <span className="text-[10px] text-slate-400">(ທາງເລືອກ)</span>
              <div className="flex-1 h-px bg-violet-100" />
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
              <div className="relative w-full rounded-xl overflow-hidden border-2 border-violet-200">
                <img src={imagePreview} alt="preview" className="w-full max-h-44 object-contain bg-muted" />
                <button onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 transition-colors text-sm text-muted-foreground hover:text-violet-600">
                <ImagePlus size={16} />
                ກົດເພື່ອແນບຮູບ
              </button>
            )}
          </div>

          {/* ── Buttons ── */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
              ຍົກເລີກ
            </button>
            <button onClick={handleSubmit} disabled={createTicket.isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(0,66%,36%) 0%, hsl(0,66%,48%) 100%)" }}>
              {createTicket.isPending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງບັນທຶກ...</>
                : <><Plus size={15} />ສ້າງ Ticket</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ ticket, onClose, onSaved }) {
  const updateTicket = useUpdateTicket();
  const [errors, setErrors] = useState({});

  const splitDate = (iso) => iso ? iso.slice(0, 10) : "";
  const splitTime = (iso) => iso && iso.length >= 16 ? iso.slice(11, 16) : "00:00";

  const [form, setForm] = useState({
    customerName:      ticket.customerName      ?? "",
    customerPhone:     ticket.customerPhone     ?? "",
    customerAddress:   ticket.customerAddress   ?? "",
    customerAccountId: ticket.customerAccountId ?? "",
    customerSpeed:     ticket.customerSpeed     ?? "",
    category:          ticket.category          ?? "ອິນເຕີເນັດຊ້າ",
    priority:          ticket.priority          ?? "normal",
    description:       ticket.description       ?? "",
    contactMethod:     ticket.contactMethod     ?? "ໂທລະສັບ",
    status:            ticket.status            ?? "open",
    reportedAt:        splitDate(ticket.reportedAt),
    reportedAtTime:    splitTime(ticket.reportedAt),
    dispatchedAt:      splitDate(ticket.dispatchedAt),
    dispatchedAtTime:  splitTime(ticket.dispatchedAt),
  });

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.customerName.trim()) e.customerName = "ກະລຸນາໃສ່ຊື່ລູກຄ້າ";
    if (!form.customerPhone.trim()) e.customerPhone = "ກະລຸນາໃສ່ເບີໂທ";
    if (!form.description.trim()) e.description = "ກະລຸນາໃສ່ລາຍລະອຽດ";
    if (!form.reportedAt) e.reportedAt = "ກະລຸນາໃສ່ວັນທີ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const reportedAt = form.reportedAt
      ? `${form.reportedAt}T${form.reportedAtTime || "00:00"}:00`
      : null;
    const data = {
      ...form,
      reportedAt,
      dispatchedAt: form.dispatchedAt
        ? `${form.dispatchedAt}T${form.dispatchedAtTime || "00:00"}:00`
        : null,
    };
    updateTicket.mutate({ id: ticket.id, data }, {
      onSuccess: () => { onSaved(); onClose(); },
    });
  };

  const inputCls = (field) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] bg-background transition-colors ${
      errors[field] ? "border-red-400 bg-red-50/50" : "border-border"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-3 overflow-y-auto py-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg my-4 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border"
          style={{ background: "linear-gradient(135deg, hsl(220,70%,25%) 0%, hsl(220,70%,42%) 100%)" }}>
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Pencil size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-white text-sm">ແກ້ໄຂ Ticket</h2>
            <p className="text-white/60 text-[11px] mt-0.5 truncate">{ticket.ticketNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Section 1: Customer ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-[hsl(0,66%,42%)]" />
              <span className="text-[11px] font-extrabold text-[hsl(0,66%,42%)] uppercase tracking-widest">ຂໍ້ມູນລູກຄ້າ</span>
              <div className="flex-1 h-px bg-red-100" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ຊື່ລູກຄ້າ <span className="text-red-500">*</span>
                  </label>
                  <input value={form.customerName} onChange={e => set("customerName", e.target.value)}
                    placeholder="ຊື່ລູກຄ້າ..." className={inputCls("customerName")} />
                  <FieldErr msg={errors.customerName} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ເບີໂທ <span className="text-red-500">*</span>
                  </label>
                  <input value={form.customerPhone} onChange={e => set("customerPhone", e.target.value)}
                    placeholder="020xxxxxxxx" className={inputCls("customerPhone")} />
                  <FieldErr msg={errors.customerPhone} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ທີ່ຢູ່</label>
                  <input value={form.customerAddress} onChange={e => set("customerAddress", e.target.value)}
                    placeholder="ບ້ານ, ເມືອງ..." className={inputCls("customerAddress")} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເບີ Account</label>
                  <input value={form.customerAccountId} onChange={e => set("customerAccountId", e.target.value)}
                    placeholder="81fhxxxxxx" className={inputCls("customerAccountId")} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ຄວາມໄວ</label>
                <input value={form.customerSpeed} onChange={e => set("customerSpeed", e.target.value)}
                  placeholder="10M, 30M..." className={inputCls("customerSpeed")} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Problem Info ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-amber-500" />
              <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest">ຂໍ້ມູນບັນຫາ</span>
              <div className="flex-1 h-px bg-amber-100" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ໝວດຫມູ່</label>
                  <select value={form.category} onChange={e => set("category", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ຄວາມຮີບດ່ວນ</label>
                  <select value={form.priority} onChange={e => set("priority", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  ລາຍລະອຽດ <span className="text-red-500">*</span>
                </label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                  placeholder="ອະທິບາຍບັນຫາລະອຽດ..."
                  className={`${inputCls("description")} resize-none`} />
                <FieldErr msg={errors.description} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Status, Contact & Dates ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest">ສະຖານະ, ຊ່ອງທາງ &amp; ວັນທີ</span>
              <div className="flex-1 h-px bg-blue-100" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ສະຖານະ</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    <option value="open">Queued</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ຊ່ອງທາງຕິດຕໍ່</label>
                  <select value={form.contactMethod} onChange={e => set("contactMethod", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                    {CONTACT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    ວັນທີລູກຄ້າແຈ້ງ <span className="text-red-500">*</span>
                  </label>
                  <DateInput isoMode value={form.reportedAt} onChange={v => set("reportedAt", v)} />
                  <FieldErr msg={errors.reportedAt} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເວລາ</label>
                  <TimeInput value={form.reportedAtTime} onChange={v => set("reportedAtTime", v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ວັນທີສົ່ງທີມ</label>
                  <DateInput isoMode value={form.dispatchedAt} onChange={v => set("dispatchedAt", v)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">ເວລາສົ່ງທີມ</label>
                  <TimeInput value={form.dispatchedAtTime} onChange={v => set("dispatchedAtTime", v)} disabled={!form.dispatchedAt} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Buttons ── */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
              ຍົກເລີກ
            </button>
            <button onClick={handleSave} disabled={updateTicket.isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, hsl(220,70%,30%) 0%, hsl(220,70%,48%) 100%)" }}>
              {updateTicket.isPending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງບັນທຶກ...</>
                : <><Save size={14} />ບັນທຶກການແກ້ໄຂ</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function headerRow(ws, rowNum, cols) {
  cols.forEach((h, i) => {
    const cell = ws.getCell(rowNum, i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const s = { style: "thin", color: { argb: "FF" + RED_HEX } };
    cell.border = { top: s, left: s, bottom: s, right: s };
  });
  ws.getRow(rowNum).height = 22;
}

function dataCell(ws, row, col, value, bg) {
  const cell = ws.getCell(row, col);
  cell.value = value ?? "";
  cell.font = { name: "Calibri", size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
  cell.alignment = { vertical: "middle", wrapText: false };
  const s = { style: "hair", color: { argb: "FFE0E0E0" } };
  cell.border = { top: s, left: s, bottom: s, right: s };
  return cell;
}

function addTitleBlock(ws, title, cols, dateStr) {
  ws.mergeCells(1, 1, 1, cols);
  const t1 = ws.getCell(1, 1);
  t1.value = "FTTH WiFi — ລາຍງານບັນຫາລູກຄ້າ";
  t1.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;
  ws.mergeCells(2, 1, 2, cols);
  const t2 = ws.getCell(2, 1);
  t2.value = title;
  t2.font = { name: "Calibri", bold: true, size: 12, color: { argb: "FF" + RED_HEX } };
  t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_LIGHT } };
  t2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;
  ws.mergeCells(3, 1, 3, cols);
  const t3 = ws.getCell(3, 1);
  t3.value = `ສ້າງເມື່ອ: ${dateStr}`;
  t3.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF757575" } };
  t3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
  t3.alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(3).height = 16;
  ws.mergeCells(4, 1, 4, cols);
  ws.getRow(4).height = 6;
}

const TEMPLATE_COLS = [
  { header: "ຊື່ລູກຄ້າ *", key: "customerName", width: 22 },
  { header: "ທີ່ຢູ່", key: "customerAddress", width: 22 },
  { header: "ເບີໂທ", key: "customerPhone", width: 14 },
  { header: "ເບີ Account", key: "customerAccountId", width: 14 },
  { header: "ໝວດໝູ່", key: "category", width: 20 },
  { header: "ລາຍລະອຽດ *", key: "description", width: 32 },
  { header: "ວັນທີລູກຄ້າແຈ້ງ (dd/MM/yyyy)", key: "reportedAt", width: 22 },
  { header: "ວັນທີສົ່ງທີມ (dd/MM/yyyy)", key: "dispatchedAt", width: 22 },
  { header: "ຄວາມດ່ວນ", key: "priority", width: 12 },
  { header: "ຊ່ອງທາງ", key: "contactMethod", width: 16 },
  { header: "ສະຖານະ", key: "status", width: 16 },
];

async function downloadTicketTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LTC FTTH Tracker";
  const ws = wb.addWorksheet("ແບບຟອມແຈ້ງບັນຫາ");
  const NCOLS = TEMPLATE_COLS.length;
  const lastCol = String.fromCharCode(64 + NCOLS);

  ws.mergeCells(`A1:${lastCol}1`);
  const t1 = ws.getCell("A1");
  t1.value = "LTC FTTH Tracker — ແບບຟອມນຳເຂົ້າລາຍການແຈ້ງບັນຫາ";
  t1.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${lastCol}2`);
  const t2 = ws.getCell("A2");
  t2.value = "* = ຕ້ອງກ່ອນ | ໝວດໝູ່: ອິນເຕີເນັດຊ້າ / ອິນເຕີເນັດຂາດ / ອຸປະກອນຂັດຂ້ອງ / ຂໍຕໍ່ອາຍຸ / ອື່ນໆ | ຄວາມດ່ວນ: urgent / high / normal / low | ຊ່ອງທາງ: ໂທລະສັບ / WhatsApp / ມາດ້ວຍຕົນເອງ / ອື່ນໆ | Status: Queued / In Progress / Pending / Resolved / Closed";
  t2.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF555555" } };
  t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } };
  t2.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  ws.getRow(2).height = 32;

  TEMPLATE_COLS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    const cell = ws.getCell(3, i + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const s = { style: "thin", color: { argb: "FF" + RED_HEX } };
    cell.border = { top: s, left: s, bottom: s, right: s };
  });
  ws.getRow(3).height = 22;

  // Add data validation for status column (column 11 = K)
  for (let r = 4; r <= 200; r++) {
    ws.getCell(r, 11).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Queued,In Progress,Pending,Resolved,Closed"'],
    };
  }

  const examples = [
    ["ນາງ ເຄນ", "ກໍນ້ອຍ", "02058730539", "81fh212602", "ອິນເຕີເນັດຂາດ", "ໃຊ້ງານບໍ່ໄດ້ ສາຍຂາດ", "14/05/2026", "", "normal", "ໂທລະສັບ", "Queued"],
    ["ທ່ານ ສົມ", "ໂນນສະຫວາດ", "02012345678", "AC002", "ອິນເຕີເນັດຊ້າ", "ອິນເຕີເນັດຊ້າຫຼາຍ", "14/05/2026", "15/05/2026", "high", "WhatsApp", "In Progress"],
  ];
  examples.forEach((row, ri) => {
    const r = ri + 4;
    const bg = ri % 2 === 0 ? "FFFFFF" : "F5F5F5";
    ws.getRow(r).height = 18;
    row.forEach((v, ci) => {
      const cell = ws.getCell(r, ci + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
      cell.alignment = { vertical: "middle" };
      const s = { style: "hair", color: { argb: "FFE0E0E0" } };
      cell.border = { top: s, left: s, bottom: s, right: s };
    });
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: NCOLS } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "FTTH_ແບບຟອມແຈ້ງບັນຫາ.xlsx";
  a.click();
}

function parseTicketDate(val) {
  if (!val) return "";
  if (val instanceof Date) return isValid(val) ? format(val, "yyyy-MM-dd") : "";
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.slice(0, 10);
  for (const f of ["dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy"]) {
    const d = parse(str, f, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  return "";
}

function parseTicketDateTime(val) {
  if (!val) return "";
  if (val instanceof Date) return isValid(val) ? format(val, "yyyy-MM-dd'T'HH:mm:ss") : "";
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
    return str.replace(" ", "T") + (str.length === 16 ? ":00" : "");
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}T/)) return str;
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str + "T00:00:00";
  return parseTicketDate(str) ? parseTicketDate(str) + "T00:00:00" : "";
}

const STATUS_MAP = {
  "queued": "open", "open": "open", "new": "open",
  "in progress": "in_progress", "in_progress": "in_progress", "inprogress": "in_progress",
  "pending": "pending",
  "resolved": "resolved",
  "closed": "closed",
  "ເປີດ": "open", "ດຳເນີນງານ": "in_progress",
  "ແກ້ໄຂແລ້ວ": "resolved", "ປິດ": "closed",
};

function mapLtcClassification(cls) {
  if (!cls) return "ອື່ນໆ";
  const c = cls.toLowerCase();
  if (c.includes("f1") || c.includes("ໃຊ້ງານບໍ່ໄດ້") || c.includes("ຂາດ") || c.includes("unavailable")) return "ອິນເຕີເນັດຂາດ";
  if (c.includes("f2") || c.includes("ຊ້າ") || c.includes("slow") || c.includes("loss")) return "ອິນເຕີເນັດຊ້າ";
  if (c.includes("f3") || c.includes("ອຸປະກອນ") || c.includes("equipment") ||
      c.includes("p6") || c.includes("p7") || c.includes("ສາຍ") || c.includes("cable")) return "ອຸປະກອນຂັດຂ້ອງ";
  if (c.includes("ຕໍ່ອາຍຸ") || c.includes("renew")) return "ຂໍຕໍ່ອາຍຸ";
  return "ອື່ນໆ";
}

function mapLtcLevel(level) {
  if (!level) return "normal";
  const l = level.toLowerCase();
  if (l === "critical") return "urgent";
  if (l === "high" || l === "warning") return "high";
  if (l === "low") return "low";
  return "normal";
}

function parseLtcFormat(ws) {
  const parsed = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const vals = row.values.slice(1);
    const g = (i) => {
      const v = vals[i];
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v;
      if (typeof v === "object" && v.text) return String(v.text).trim();
      return String(v).trim();
    };
    const firstName = g(3);
    const lastName  = g(4);
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    const desc = g(2);
    if (!name && !desc) return;
    const village = g(14);
    const district = g(15);
    const province = g(16);
    const addressParts = [village, district, province].filter(Boolean);
    const address = addressParts.join(", ");
    const rawStatus = g(7);
    const status = STATUS_MAP[rawStatus.toLowerCase()] || STATUS_MAP[rawStatus] || "open";
    const classification = g(11);
    const rootCause = g(17);
    const solution = g(18);
    const fullDesc = [desc, rootCause ? `ສາເຫດ: ${rootCause}` : "", solution ? `ວິທີແກ້: ${solution}` : ""].filter(Boolean).join("\n");
    parsed.push({
      _id: `r${rowNum}`,
      _rowNum: rowNum,
      _errors: [],
      _statusLabel: rawStatus || "Queued",
      _ltcId: g(0),
      customerName: name || "-",
      customerAddress: address,
      customerPhone: g(6),
      customerAccountId: g(5),
      customerSpeed: null,
      category: mapLtcClassification(classification),
      description: fullDesc || desc,
      reportedAt: parseTicketDateTime(g(1)) || new Date().toISOString().slice(0, 10),
      dispatchedAt: parseTicketDateTime(g(29)) || parseTicketDateTime(g(1)) || null,
      priority: mapLtcLevel(g(13)),
      contactMethod: "ໂທລະສັບ",
      status,
    });
  });
  return parsed;
}

function parseTemplateFormat(ws, headerRow, colIndex) {
  const parsed = [];
  const validCats = ["ອິນເຕີເນັດຊ້າ", "ອິນເຕີເນັດຂາດ", "ອຸປະກອນຂັດຂ້ອງ", "ຂໍຕໍ່ອາຍຸ", "ອື່ນໆ"];
  const validPrios = ["urgent", "high", "normal", "low"];
  const validContacts = ["ໂທລະສັບ", "WhatsApp", "ມາດ້ວຍຕົນເອງ", "ອື່ນໆ"];
  ws.eachRow((row, rowNum) => {
    if (rowNum <= headerRow) return;
    const vals = row.values.slice(1);
    const get = (key) => {
      const idx = colIndex[key];
      if (idx === undefined) return "";
      const v = vals[idx];
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v;
      if (typeof v === "object" && v.text) return String(v.text).trim();
      return String(v).trim();
    };
    const name = get("ຊື່ລູກຄ້າ");
    const desc = get("ລາຍລະອຽດ");
    if (!name && !desc) return;
    const cat = get("ໝວດໝູ່");
    const rawStatus = get("ສະຖານະ");
    const mappedStatus = STATUS_MAP[(rawStatus || "").toLowerCase()] || STATUS_MAP[rawStatus] || "open";
    const errors = [];
    if (!name) errors.push("ຂາດຊື່ລູກຄ້າ");
    if (!desc) errors.push("ຂາດລາຍລະອຽດ");
    parsed.push({
      _id: `r${rowNum}`,
      _rowNum: rowNum,
      _errors: errors,
      _statusLabel: rawStatus || "Queued",
      customerName: name,
      customerAddress: get("ທີ່ຢູ່"),
      customerPhone: get("ເບີໂທ"),
      customerAccountId: get("ເບີ Account"),
      customerSpeed: null,
      category: validCats.includes(cat) ? cat : "ອື່ນໆ",
      description: desc,
      reportedAt: parseTicketDate(get("ວັນທີລູກຄ້າແຈ້ງ (dd/MM/yyyy)") || get("ວັນທີ (dd/MM/yyyy)")) || new Date().toISOString().slice(0, 10),
      dispatchedAt: parseTicketDate(get("ວັນທີສົ່ງທີມ (dd/MM/yyyy)")) || null,
      priority: validPrios.includes(get("ຄວາມດ່ວນ")) ? get("ຄວາມດ່ວນ") : "normal",
      contactMethod: validContacts.includes(get("ຊ່ອງທາງ")) ? get("ຊ່ອງທາງ") : "ໂທລະສັບ",
      status: mappedStatus,
    });
  });
  return parsed;
}

function ImportTicketsModal({ onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileFormat, setFileFormat] = useState("");
  const fileRef = useRef(null);
  const qc = useQueryClient();

  const parseFile = async (file) => {
    setParseError(""); setRows([]); setDone(null); setFileName(file.name); setFileFormat("");
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { setParseError("ບໍ່ພົບ Sheet ໃນໄຟລ໌"); return; }

      const row1vals = ws.getRow(1).values.slice(1).map(h => String(h ?? "").trim());
      const isLtcFormat = row1vals[0] === "id" && row1vals[1] === "created_at";

      let parsed = [];
      if (isLtcFormat) {
        setFileFormat("LTC");
        parsed = parseLtcFormat(ws);
      } else {
        setFileFormat("Template");
        let headerRow = 1;
        if (row1vals[0].includes("FTTH") || row1vals[0] === "") {
          headerRow = 3;
        }
        const headers = ws.getRow(headerRow).values.slice(1).map(h => String(h ?? "").trim());
        const colIndex = {};
        headers.forEach((h, i) => { colIndex[h.replace(" *", "").trim()] = i; });
        parsed = parseTemplateFormat(ws, headerRow, colIndex);
      }

      if (parsed.length === 0) { setParseError("ບໍ່ພົບຂໍ້ມູນໃນໄຟລ໌"); return; }
      setRows(parsed);
    } catch (e) {
      setParseError(`ອ່ານໄຟລ໌ຜິດພາດ: ${e.message}`);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) { setParseError("ໃສ່ເຉພາະໄຟລ໌ .xlsx ເທົ່ານັ້ນ"); return; }
    parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const validRows = rows.filter(r => r._errors.length === 0);
  const errorRows = rows.filter(r => r._errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const created = await bulkCreateTickets(validRows);
      qc.invalidateQueries();
      const now = new Date();
      const dateLabel = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const rawName = fileName ? fileName.replace(/\.xlsx?$/i, "") : `Import ${dateLabel}`;
      saveBatch({
        id: `batch_${Date.now()}`,
        name: rawName,
        importedAt: now.toISOString(),
        ticketIds: created.map(t => t.id),
        count: created.length,
        type: fileFormat === "ltc" ? "LTC" : "Manual",
        fileName: fileName || "",
      });
      setDone({ success: validRows.length, failed: errorRows.length });
      onImported?.();
    } catch (e) {
      setParseError(`ນຳເຂົ້າຜິດພາດ: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-[hsl(0,66%,42%)]" /> ນຳເຂົ້າລາຍການແຈ້ງບັນຫາ
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <FileDown size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-0.5">ຮອງຮັບ 2 ຮູບແບບ:</p>
              <p className="text-xs text-blue-600">① <span className="font-semibold text-violet-700">ໄຟລ໌ Ticket Report ຈາກ LTC</span> — ໄຟລ໌ທີ່ມີຖັນ id, created_at, description, first_name, last_name, msisdn, contact, status… ນຳເຂົ້າໄດ້ໂດຍກົງ</p>
              <p className="text-xs text-blue-600">② ແບບຟອມ Template ຂອງລະບົບນີ້</p>
              <p className="text-[10px] text-blue-500 mt-1">ສະຖານະ: QUEUED→Queued · INPROGRESS→In Progress · CLOSED→Closed &nbsp;|&nbsp; ລະດັບ: Critical→ດ່ວນ · Warning→ສູງ</p>
            </div>
            <button onClick={downloadTicketTemplate}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
              <Download size={12} /> ດາວໂຫຼດ Template
            </button>
          </div>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
            <p className="font-bold text-foreground text-lg">ນຳເຂົ້າສຳເລັດ!</p>
            <p className="text-sm text-muted-foreground">
              ສຳເລັດ <span className="text-emerald-600 font-bold">{done.success}</span> ລາຍການ
              {done.failed > 0 && <> · ຂ້າມ <span className="text-red-600 font-bold">{done.failed}</span> ລາຍການ (ຂໍ້ມູນຜິດ)</>}
            </p>
            <button onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[hsl(0,66%,42%)] text-white font-semibold text-sm hover:bg-[hsl(0,66%,35%)] transition-colors">
              ປິດ
            </button>
          </div>
        ) : (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragging ? "border-[hsl(0,66%,42%)] bg-red-50" : "border-border hover:border-[hsl(0,66%,42%)] hover:bg-muted/50"
              }`}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => handleFile(e.target.files?.[0])} />
              <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
              {fileName
                ? <p className="font-semibold text-foreground">{fileName}</p>
                : <p className="text-sm text-muted-foreground">ລາກໄຟລ໌ Excel ມາວາງ ຫຼືກົດເພື່ອເລືອກ</p>}
              <p className="text-xs text-muted-foreground mt-1">ຮອງຮັບ .xlsx ເທົ່ານັ້ນ</p>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertTriangle size={15} /> {parseError}
              </div>
            )}

            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-foreground">ພົບ {rows.length} ລາຍການ</span>
                  {fileFormat === "LTC" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                      ໄຟລ໌ LTC Export
                    </span>
                  )}
                  {fileFormat === "Template" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      Template ລະບົບ
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="text-red-600 text-xs">⚠️ {errorRows.length} ລາຍການຂໍ້ມູນຜິດ (ຈະຖືກຂ້າມ)</span>
                  )}
                  <span className="text-emerald-600 text-xs ml-auto">✓ {validRows.length} ລາຍການພ້ອມນຳເຂົ້າ</span>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                        {fileFormat === "LTC" && <th className="text-left px-3 py-2 font-semibold text-muted-foreground">LTC ID</th>}
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ຊື່</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ເບີ Account</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ວັນທີແຈ້ງ</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ລາຍລະອຽດ</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ສະຖານະ</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ກວດສອບ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const statusStyle = {
                          open: "bg-blue-100 text-blue-700",
                          in_progress: "bg-amber-100 text-amber-700",
                          pending: "bg-purple-100 text-purple-700",
                          resolved: "bg-emerald-100 text-emerald-700",
                          closed: "bg-muted text-muted-foreground",
                        }[r.status] || "bg-muted text-muted-foreground";
                        return (
                          <tr key={r._id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                            <td className="px-3 py-1.5 text-muted-foreground">{r._rowNum}</td>
                            {fileFormat === "LTC" && <td className="px-3 py-1.5 text-violet-600 font-mono text-[10px]">{r._ltcId || "-"}</td>}
                            <td className="px-3 py-1.5 font-medium text-foreground">{r.customerName || <span className="text-red-500">-</span>}</td>
                            <td className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">{r.customerAccountId || "-"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.reportedAt || <span className="text-muted-foreground/50">-</span>}</td>
                            <td className="px-3 py-1.5 text-muted-foreground max-w-[140px] truncate">{r.description || <span className="text-red-500">ຂາດ</span>}</td>
                            <td className="px-3 py-1.5">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
                                {r._statusLabel || "Queued"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              {r._errors.length > 0
                                ? <span className="text-red-600 font-medium">⚠️ {r._errors[0]}</span>
                                : <span className="text-emerald-600 font-medium">✓ ພ້ອມ</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                    ຍົກເລີກ
                  </button>
                  <button onClick={handleImport} disabled={validRows.length === 0 || importing}
                    className="flex-1 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-semibold hover:bg-[hsl(0,66%,35%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {importing
                      ? <><RefreshCw size={14} className="animate-spin" /> ກຳລັງນຳເຂົ້າ...</>
                      : <><Upload size={14} /> ນຳເຂົ້າ {validRows.length} ລາຍການ</>}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResetAllModal({ total, onConfirm, onClose, loading }) {
  const [typed, setTyped] = useState("");
  const CONFIRM_WORD = "ລຶບທັງໝົດ";
  const confirmed = typed === CONFIRM_WORD;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">ລຶບຂໍ້ມູນທັງໝົດ</h2>
            <p className="text-white/70 text-xs mt-0.5">ການດຳເນີນການນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-red-800">⚠️ ຄຳເຕືອນ: ການດຳເນີນການທີ່ຮ້າຍແຮງ</p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Ticket ທັງໝົດ <strong>{total} ລາຍການ</strong> ຈະຖືກລຶບຖາວອນ</li>
              <li>ຂໍ້ມູນປະຫວັດທຸກຢ່າງຈະຫາຍໄປ</li>
              <li>ບໍ່ສາມາດຍົກເລີກ ຫຼື ກູ້ຄືນໄດ້</li>
            </ul>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              ພິມ <span className="text-red-600 font-black">{CONFIRM_WORD}</span> ເພື່ອຢືນຢັນ
            </label>
            <input
              autoFocus
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              ຍົກເລີກ
            </button>
            <button
              onClick={onConfirm}
              disabled={!confirmed || loading}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ກຳລັງລຶບ...</>
                : <><Trash2 size={14} /> ລຶບທັງໝົດ {total} ລາຍການ</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportProblem() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [location, setLocation] = useLocation();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf("?");
    const params = qIdx !== -1 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
    if (params.get("new") === "1") {
      setShowCreate(true);
    }
    const st = params.get("status");
    if (st) setStatusFilter(st);
  }, []);

  // ── ຂຽນ statusFilter ກັບ URL ທຸກເທື່ອທີ່ filter ປ່ຽນ ──
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const baseHash = hash.split("?")[0] || "#/report-problem";
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const qs = params.toString();
      const newHash = qs ? `${baseHash}?${qs}` : baseHash;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, "", window.location.pathname + newHash);
      }
    } catch {}
  }, [statusFilter, search]);

  const { data: tickets = [] } = useListTickets();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const qc = useQueryClient();

  const counts = useMemo(() => ({
    "": tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
  }), [tickets]);

  const filtered = useMemo(() => tickets
    .filter(t => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.customerName?.toLowerCase().includes(q) ||
          t.customerPhone?.toLowerCase().includes(q) ||
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [tickets, statusFilter, search]);

  // ─── reset ໜ້າ ເມື່ອ filter ປ່ຽນ ───────────────────────────────
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dailyGroups = useMemo(() => {
    let base = tickets;
    if (dateFrom) base = base.filter(t => {
      const d = t.reportedAt || t.createdAt?.slice(0, 10);
      return d >= dateFrom;
    });
    if (dateTo) base = base.filter(t => {
      const d = t.reportedAt || t.createdAt?.slice(0, 10);
      return d <= dateTo;
    });
    const map = {};
    base.forEach(t => {
      const day = t.reportedAt || t.createdAt?.slice(0, 10) || "unknown";
      if (!map[day]) map[day] = { date: day, total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, tickets: [] };
      map[day].total++;
      map[day][t.status] = (map[day][t.status] || 0) + 1;
      map[day].tickets.push(t);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [tickets, dateFrom, dateTo]);

  const handleStatusChange = (id, status) => {
    updateTicket.mutate({ id, data: { status } }, { onSuccess: () => qc.invalidateQueries() });
  };

  const handleDelete = (id) => {
    if (!confirm("ທ່ານຕ້ອງການລຶບ ticket ນີ້ຫຼືບໍ່?")) return;
    deleteTicket.mutate({ id }, { onSuccess: () => qc.invalidateQueries() });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        new Promise((res, rej) =>
          updateTicket.mutate({ id, data: { status } }, { onSuccess: res, onError: rej })
        )
      ));
      qc.invalidateQueries();
      setSelectedIds(new Set());
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`ທ່ານຕ້ອງການລຶບ ${selectedIds.size} ticket ທີ່ເລືອກຫຼືບໍ່?`)) return;
    setBulkUpdating(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        new Promise((res, rej) =>
          deleteTicket.mutate({ id }, { onSuccess: res, onError: rej })
        )
      ));
      qc.invalidateQueries();
      setSelectedIds(new Set());
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleResetAll = async () => {
    setResetLoading(true);
    try {
      await bulkDeleteAllTickets(tickets.map(t => t.id));
      qc.invalidateQueries();
      setSelectedIds(new Set());
      setShowResetModal(false);
    } finally {
      setResetLoading(false);
    }
  };

  const statusLabelMap = { open: "Queued", in_progress: "In Progress", pending: "Pending", resolved: "Resolved", closed: "Closed" };
  const priorityLabelMap = { urgent: "ດ່ວນ", high: "ສູງ", normal: "ປົກກະຕິ", low: "ຕ່ຳ" };

  async function exportToExcel() {
    setExporting(true);
    try {
      const now = new Date();
      const dateStr = format(now, "dd/MM/yyyy HH:mm");
      const fileDate = format(now, "yyyyMMdd");

      const exportTickets = exportMonth
        ? tickets.filter(t => {
            const d = t.reportedAt || t.createdAt?.slice(0, 10) || "";
            return d.startsWith(exportMonth);
          })
        : tickets;

      const monthLabel = exportMonth
        ? `ເດືອນ ${exportMonth.slice(5, 7)}/${exportMonth.slice(0, 4)}`
        : "ທັງໝົດ";
      const fileMonthSuffix = exportMonth ? `_${exportMonth.replace("-", "")}` : "";

      const wb = new ExcelJS.Workbook();
      wb.creator = "LTC FTTH Tracker"; wb.created = now;

      const ws1 = wb.addWorksheet("ທັງໝົດ Tickets", { properties: { tabColor: { argb: "FF" + RED_HEX } } });
      const COLS1 = ["#", "Ticket No.", "ຊື່ລູກຄ້າ", "ເບີໂທ", "ທີ່ຢູ່", "Account ID", "ໝວດຫມູ່", "ຄວາມດ່ວນ", "ສະຖານະ", "ຊ່ອງທາງ", "ວັນທີແຈ້ງ", "ວັນທີສ້າງ", "ລາຍລະອຽດ"];
      ws1.columns = [
        { width: 5 }, { width: 14 }, { width: 22 }, { width: 14 }, { width: 22 },
        { width: 14 }, { width: 16 }, { width: 10 }, { width: 14 }, { width: 14 },
        { width: 13 }, { width: 18 }, { width: 32 },
      ];
      addTitleBlock(ws1, `ລາຍງານ Ticket — ${monthLabel}`, COLS1.length, dateStr);
      headerRow(ws1, 5, COLS1);
      ws1.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS1.length } };
      exportTickets.forEach((t, i) => {
        const r = i + 6;
        const bg = i % 2 === 0 ? WHITE : GREY;
        const statusBg = { open: RED_LIGHT, in_progress: AMBER, resolved: GREEN_LIGHT, closed: GREY }[t.status] ?? bg;
        ws1.getRow(r).height = 18;
        const vals = [
          i + 1, t.ticketNumber ?? "", t.customerName ?? "", t.customerPhone ?? "",
          t.customerAddress ?? "", t.customerAccountId ?? "",
          t.category ?? "", priorityLabelMap[t.priority] ?? t.priority ?? "",
          statusLabelMap[t.status] ?? t.status ?? "",
          t.contactMethod ?? "",
          t.reportedAt ? format(new Date(t.reportedAt), "dd/MM/yyyy") : "",
          t.createdAt ? format(parseISO(t.createdAt), "dd/MM/yyyy HH:mm") : "",
          t.description ?? "",
        ];
        vals.forEach((v, ci) => {
          const cell = dataCell(ws1, r, ci + 1, v, ci === 8 ? statusBg : bg);
          if (ci === 0) { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.font = { bold: true, size: 10, name: "Calibri" }; }
          if (ci === 2) cell.font = { bold: true, size: 10, name: "Calibri" };
          if (ci === 8) {
            const colors = { Queued: "1565C0", "In Progress": "E65100", Pending: "6A1B9A", Resolved: "2E7D32", Closed: "757575" };
            cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF" + (colors[String(v)] ?? "000000") } };
          }
        });
      });
      const expCounts = exportTickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
      const lr1 = exportTickets.length + 6;
      ws1.mergeCells(lr1, 1, lr1, COLS1.length);
      const fc1 = ws1.getCell(lr1, 1);
      fc1.value = `ທັງໝົດ: ${exportTickets.length} Tickets (${monthLabel})  |  Queued: ${expCounts.open || 0}  |  In Progress: ${expCounts.in_progress || 0}  |  Pending: ${expCounts.pending || 0}  |  Resolved: ${expCounts.resolved || 0}  |  Closed: ${expCounts.closed || 0}`;
      fc1.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
      fc1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
      fc1.alignment = { horizontal: "center", vertical: "middle" };
      ws1.getRow(lr1).height = 22;

      const ws2 = wb.addWorksheet("ສະຫຼຸບລາຍວັນ", { properties: { tabColor: { argb: "FF2E7D32" } } });
      const COLS2 = ["ວັນທີ", "ທັງໝົດ", "Queued", "In Progress", "Pending", "Resolved", "Closed", "% Resolved"];
      ws2.columns = [{ width: 14 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 12 }];
      addTitleBlock(ws2, `ສະຫຼຸບລາຍງານປັນຫາ ແຕ່ລະວັນ — ${monthLabel}`, COLS2.length, dateStr);
      headerRow(ws2, 5, COLS2);
      ws2.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS2.length } };
      const allDays = Object.values(
        exportTickets.reduce((m, t) => {
          const day = t.reportedAt || t.createdAt?.slice(0, 10) || "unknown";
          if (!m[day]) m[day] = { date: day, total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
          m[day].total++; m[day][t.status] = (m[day][t.status] || 0) + 1;
          return m;
        }, {})
      ).sort((a, b) => b.date.localeCompare(a.date));
      allDays.forEach((d, i) => {
        const r = i + 6;
        const bg = i % 2 === 0 ? WHITE : BLUE_LIGHT;
        ws2.getRow(r).height = 18;
        const pct = d.total > 0 ? Math.round((d.resolved + d.closed) / d.total * 100) : 0;
        const vals = [
          d.date ? format(new Date(d.date), "dd/MM/yyyy") : d.date,
          d.total, d.open, d.in_progress, d.resolved, d.closed, `${pct}%`,
        ];
        vals.forEach((v, ci) => {
          const cell = dataCell(ws2, r, ci + 1, v, bg);
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (ci === 0) { cell.alignment = { horizontal: "left", vertical: "middle" }; cell.font = { bold: true, size: 10, name: "Calibri" }; }
          if (ci === 1) cell.font = { bold: true, size: 10, name: "Calibri" };
          if (ci === 4) cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF2E7D32" } };
          if (ci === 6) {
            const color = pct >= 80 ? "2E7D32" : pct >= 50 ? "E65100" : RED_HEX;
            cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF" + color } };
          }
        });
      });
      const lr2 = allDays.length + 6;
      const totalAll = allDays.reduce((s, d) => s + d.total, 0);
      const totalRes = allDays.reduce((s, d) => s + d.resolved + d.closed, 0);
      const totalPct = totalAll > 0 ? Math.round(totalRes / totalAll * 100) : 0;
      const sumVals = ["ລວມທັງໝົດ", totalAll, allDays.reduce((s,d)=>s+d.open,0), allDays.reduce((s,d)=>s+d.in_progress,0), allDays.reduce((s,d)=>s+d.resolved,0), allDays.reduce((s,d)=>s+d.closed,0), `${totalPct}%`];
      sumVals.forEach((v, i) => {
        const cell = ws2.getCell(lr2, i + 1);
        cell.value = v;
        cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      ws2.getRow(lr2).height = 22;

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `FTTH_Tickets${fileMonthSuffix}_${fileDate}.xlsx`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportLtcFormat() {
    setExporting(true);
    try {
      const now = new Date();
      const exportTickets = exportMonth
        ? tickets.filter(t => {
            const d = t.reportedAt || t.createdAt?.slice(0, 10) || "";
            return d.startsWith(exportMonth);
          })
        : tickets;

      const monthLabel = exportMonth
        ? `${exportMonth.slice(5, 7)}-${exportMonth.slice(0, 4)}`
        : format(now, "MM-yyyy");
      const fileMonthSuffix = exportMonth ? `_${exportMonth.replace("-", "")}` : "";

      const wb = new ExcelJS.Workbook();
      wb.creator = "LTC FTTH Tracker";
      const ws = wb.addWorksheet(monthLabel, { properties: { tabColor: { argb: "FF" + RED_HEX } } });

      const NCOLS = 22;
      ws.columns = [
        { width: 5 },  { width: 22 }, { width: 18 }, { width: 12 }, { width: 12 },
        { width: 14 }, { width: 6 },  { width: 6 },  { width: 6 },  { width: 6 },
        { width: 8 },  { width: 14 }, { width: 20 }, { width: 22 }, { width: 34 },
        { width: 20 }, { width: 20 }, { width: 20 }, { width: 8 },  { width: 8 },
        { width: 14 }, { width: 18 },
      ];

      const RB = { style: "thin", color: { argb: "FF" + RED_HEX } };
      const hCell = (r, c, val) => {
        const cell = ws.getCell(r, c);
        cell.value = val;
        cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { top: RB, left: RB, bottom: RB, right: RB };
        return cell;
      };

      ws.mergeCells(1, 1, 1, NCOLS);
      const title = ws.getCell(1, 1);
      title.value = "ຜົນການປະຕິບັດຄຳຮ້ອງຮຽນ ແລະ ຂໍ້ສະເໜີຂອງລູກຄ້າ (MBB,FBB,PSTN,LMM)";
      title.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;

      [
        [1, "ລ/ດ"], [2, "ຊື່ ແລະ ນາມສະກຸນ"], [3, "ບ້ານ"],
        [4, "ເມືອງ"], [5, "ແຂວງ"], [6, "ເບີຕິດຕໍ່"],
      ].forEach(([c, h]) => {
        ws.mergeCells(2, c, 3, c);
        hCell(2, c, h);
      });

      ws.mergeCells(2, 7, 2, 10);
      hCell(2, 7, "ບໍລີການ");
      ["FBB", "PSTN", "MBB", "LMM"].forEach((h, i) => hCell(3, 7 + i, h));

      [[11, "ປະເພດ"], [12, "ນ້ຳເບີຕິດຄັດ"], [13, "ວັນເວລາແຈ້ງ"], [14, "ບັນຫາ"], [15, "ລາຍລະອຽດຮ້ອງຮຽນ"]].forEach(([c, h]) => {
        ws.mergeCells(2, c, 3, c);
        hCell(2, c, h);
      });

      ws.mergeCells(2, 16, 2, 20);
      hCell(2, 16, "ພາກສ່ວນແກ້ໄຂ");
      ["ວັນທີ ແລະ ເວລາ", "ສາເຫດບັນຫາ", "ວິທີ ແກ້ໄຂ", "ສຳເລັດ", "ບໍ່ສຳເລັດ"].forEach((h, i) => hCell(3, 16 + i, h));

      ws.mergeCells(2, 21, 3, 21); hCell(2, 21, "ຜູ້ແກ້ໄຂ");
      ws.mergeCells(2, 22, 3, 22); hCell(2, 22, "ໝາຍເຫດ");
      ws.getRow(2).height = 22;
      ws.getRow(3).height = 22;

      const catCode = {
        "ອິນເຕີເນັດຂາດ":     "F1_ບັນຫາ ໃຊ້ງານບໍ່ໄດ້",
        "ອິນເຕີເນັດຊ້າ":     "F2_ບັນຫາ ໃຊ້ງານຊ້າຫຼາຍ",
        "ອຸປະກອນຂັດຂ້ອງ":   "F3_ບັນຫາອຸປະກອນ",
        "ຂໍຕໍ່ອາຍຸ":          "P1_ຕ້ອງການຕໍ່ອາຍຸ",
        "ອື່ນໆ":              "F5_ອື່ນໆ",
      };

      exportTickets.forEach((t, i) => {
        const r = i + 4;
        const bg = i % 2 === 0 ? WHITE : GREY;
        ws.getRow(r).height = 18;
        const resolved = t.status === "resolved" || t.status === "closed";
        const vals = [
          i + 1,
          t.customerName ?? "",
          t.customerAddress ?? "",
          "",
          "",
          t.customerPhone ?? "",
          "1", "", "", "",
          "FTTH",
          t.customerAccountId ?? "",
          t.reportedAt ? format(new Date(t.reportedAt), "dd/MM/yyyy HH:mm") : "",
          catCode[t.category] ?? t.category ?? "",
          t.description ?? "",
          t.dispatchedAt ? format(new Date(t.dispatchedAt), "dd/MM/yyyy HH:mm") : "",
          "",
          "",
          resolved ? "1" : "",
          !resolved && t.status !== "open" ? "1" : "",
          "",
          "",
        ];
        vals.forEach((v, ci) => {
          const cell = dataCell(ws, r, ci + 1, v, bg);
          if (ci === 0) { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.font = { bold: true, size: 10, name: "Calibri" }; }
          if (ci === 1) cell.font = { bold: true, size: 10, name: "Calibri" };
          if ([6,7,8,9,18,19].includes(ci)) cell.alignment = { horizontal: "center", vertical: "middle" };
          if (ci === 18 && resolved) cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF2E7D32" } };
        });
      });

      const lr = exportTickets.length + 4;
      ws.mergeCells(lr, 1, lr, NCOLS);
      const fc = ws.getCell(lr, 1);
      const done = exportTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
      fc.value = `ທັງໝົດ: ${exportTickets.length} ລາຍການ  |  ສຳເລັດ: ${done}  |  ຍັງດຳເນີນ: ${exportTickets.length - done}`;
      fc.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
      fc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
      fc.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(lr).height = 22;

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: NCOLS } };

      /* ══════════════════════════════════════════════
         SHEET 2 — ບົດສະຫຼຸບ (auto-calculated)
      ══════════════════════════════════════════════ */
      const ws2 = wb.addWorksheet("ບົດສະຫຼຸບ", { properties: { tabColor: { argb: "FF2E7D32" } } });
      const SC = 7;
      ws2.columns = [
        { width: 8 }, { width: 38 }, { width: 12 }, { width: 12 },
        { width: 12 }, { width: 12 }, { width: 20 },
      ];

      const sRB = { style: "thin", color: { argb: "FF" + RED_HEX } };
      const sBdr = { top: sRB, left: sRB, bottom: sRB, right: sRB };
      const sCell = (r, c, val, opts = {}) => {
        const cell = ws2.getCell(r, c);
        cell.value = val ?? "";
        cell.font  = { name: "Calibri", size: opts.size ?? 10, bold: opts.bold ?? false, color: { argb: opts.color ?? "FF222222" }, italic: opts.italic ?? false };
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + (opts.bg ?? WHITE) } };
        cell.alignment = { horizontal: opts.h ?? "left", vertical: "middle", wrapText: opts.wrap ?? false };
        if (opts.border) cell.border = sBdr;
        return cell;
      };
      const sHdr = (r, c, val) => {
        const cell = ws2.getCell(r, c);
        cell.value = val;
        cell.font  = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = sBdr;
        return cell;
      };

      /* ── R1: ສາທາລະນະລັດ ── */
      ws2.mergeCells(1, 1, 1, SC);
      sCell(1, 1, "ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", { bold: true, size: 12, h: "center" });
      ws2.getRow(1).height = 20;

      /* ── R2: ຄຳຂວັນ ── */
      ws2.mergeCells(2, 1, 2, SC);
      sCell(2, 1, "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ", { bold: true, size: 11, h: "center" });
      ws2.getRow(2).height = 18;

      /* ── R3: ຫ້ວຫາດ ── */
      ws2.mergeCells(3, 1, 3, SC);
      sCell(3, 1, "ບໍລິສັດ ລາວ ໂທລະຄົມມະນາຄົມ ມະຫາຊົນ", { bold: true, size: 11, h: "center" });
      ws2.getRow(3).height = 18;

      /* ── R4: ພະແນກ ── */
      ws2.mergeCells(4, 1, 4, SC);
      sCell(4, 1, "ພະແນກ/ລລທ ສາຂາແຂວງ", { size: 10, h: "left" });
      ws2.getRow(4).height = 16;

      /* ── R5: blank ── */
      ws2.getRow(5).height = 8;

      /* ── R6: ບົດສະຫຼຸບ ── */
      ws2.mergeCells(6, 1, 6, SC);
      sCell(6, 1, "ບົດສະຫຼຸບ", { bold: true, size: 16, h: "center" });
      ws2.getRow(6).height = 26;

      /* ── R7: blank ── */
      ws2.getRow(7).height = 6;

      /* ── R8: ຫົວຂໍ້ຍ່ອຍ ── */
      ws2.mergeCells(8, 1, 8, SC);
      sCell(8, 1, "ການຮ້ອງຮຽນ ແລະ ຄຳຕຳນິສົ່ງຂ່າວ ຂອງລູກຄ້າ — ປະຈໍາ" + (exportMonth ? `ເດືອນ ${exportMonth.slice(5, 7)}/${exportMonth.slice(0, 4)}` : format(now, "MM/yyyy")), { bold: true, size: 11, h: "center" });
      ws2.getRow(8).height = 20;

      /* ── R9: blank ── */
      ws2.getRow(9).height = 6;

      /* ── R10-R11: double-row headers ── */
      [[1,"ລ/ດ"],[3,"ຈໍານວນທັງໝົດ"],[4,"ແກ້ໄຂສຳເລັດ"],[5,"ແກ້ໄຂບໍ່ສຳເລັດ"],[6,"ຄິດເປັນ%"],[7,"ໝາຍເຫດ"]].forEach(([c, h]) => {
        ws2.mergeCells(10, c, 11, c);
        sHdr(10, c, h);
      });
      ws2.mergeCells(10, 2, 11, 2);
      sHdr(10, 2, "ລາຍການບັນຫາຂອງລູກຄ້າ ລລທ ຮ້ອງຮຽນ");
      ws2.getRow(10).height = 22;
      ws2.getRow(11).height = 22;

      /* ── Data rows: calculate by category ── */
      const CATS = [
        { label: "ບັນຫາ ໃຊ້ງານບໍ່ໄດ້ (F1)",   key: "ອິນເຕີເນັດຂາດ" },
        { label: "ບັນຫາ ໃຊ້ງານຊ້າຫຼາຍ (F2)",   key: "ອິນເຕີເນັດຊ້າ" },
        { label: "ບັນຫາອຸປະກອນ (F3)",           key: "ອຸປະກອນຂັດຂ້ອງ" },
        { label: "ຕ້ອງການຕໍ່ອາຍຸ (P1)",          key: "ຂໍຕໍ່ອາຍຸ" },
        { label: "ບັນຫາອື່ນໆ (F5)",              key: "ອື່ນໆ" },
      ];

      let grandTotal = 0, grandDone = 0, grandFail = 0;
      let dataRow = 12;

      CATS.forEach((cat, idx) => {
        const catTickets = exportTickets.filter(t => t.category === cat.key);
        const total = catTickets.length;
        const done  = catTickets.filter(t => t.status === "resolved" || t.status === "closed").length;
        const fail  = total - done;
        const pct   = total > 0 ? (done / total * 100).toFixed(1) + "%" : "—";
        const bg = idx % 2 === 0 ? WHITE : GREY;

        grandTotal += total; grandDone += done; grandFail += fail;

        ws2.getRow(dataRow).height = 20;
        sCell(dataRow, 1, idx + 1,    { h: "center", bg, border: true });
        sCell(dataRow, 2, cat.label,  { bg, border: true, bold: true });
        sCell(dataRow, 3, total,      { h: "center", bg, border: true, bold: total > 0 });
        sCell(dataRow, 4, done,       { h: "center", bg, border: true, color: done > 0 ? "FF2E7D32" : "FF222222", bold: done > 0 });
        sCell(dataRow, 5, fail,       { h: "center", bg, border: true, color: fail > 0 ? "FF" + RED_HEX : "FF222222" });
        const pctCell = sCell(dataRow, 6, pct, { h: "center", bg, border: true });
        if (total > 0) {
          const pctNum = done / total;
          pctCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + (pctNum >= 0.8 ? "2E7D32" : pctNum >= 0.5 ? "E65100" : RED_HEX) } };
        }
        sCell(dataRow, 7, "", { bg, border: true });
        dataRow++;
      });

      /* ── Total row ── */
      const grandPct = grandTotal > 0 ? (grandDone / grandTotal * 100).toFixed(1) + "%" : "—";
      ws2.getRow(dataRow).height = 22;
      ws2.mergeCells(dataRow, 1, dataRow, 2);
      sCell(dataRow, 1, "ລວມທັງໝົດ", { bold: true, size: 11, h: "center", bg: RED_HEX, color: "FFFFFFFF", border: true });
      [grandTotal, grandDone, grandFail].forEach((v, i) => {
        const cell = ws2.getCell(dataRow, i + 3);
        cell.value = v;
        cell.font  = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = sBdr;
      });
      const gpCell = ws2.getCell(dataRow, 6);
      gpCell.value = grandPct;
      gpCell.font  = { name: "Calibri", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      gpCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
      gpCell.alignment = { horizontal: "center", vertical: "middle" };
      gpCell.border = sBdr;
      sCell(dataRow, 7, "", { bg: RED_HEX, border: true });
      dataRow++;

      /* ── blank row + signature ── */
      ws2.getRow(dataRow).height = 16;
      dataRow++;

      ws2.getRow(dataRow).height = 20;
      ws2.mergeCells(dataRow, 1, dataRow, 2);
      sCell(dataRow, 1, "ຫົວໜ້າພະແນກ/ສາຂາແຂວງ", { h: "center", bold: true });
      ws2.mergeCells(dataRow, 3, dataRow, 5);
      sCell(dataRow, 3, "ຫົວໜ້າພາກສ່ວນ", { h: "center", bold: true });
      ws2.mergeCells(dataRow, 6, dataRow, 7);
      sCell(dataRow, 6, "ຜູ້ສະຫຼຸບ", { h: "center", bold: true });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ຜົນການປະຕິບັດ_${monthLabel}.xlsx`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => qc.invalidateQueries()} />}
      {editingTicket && (
        <EditModal
          ticket={editingTicket}
          onClose={() => setEditingTicket(null)}
          onSaved={() => qc.invalidateQueries()}
        />
      )}
      {showImport && <ImportTicketsModal onClose={() => setShowImport(false)} onImported={() => qc.invalidateQueries()} />}
      {showResetModal && (
        <ResetAllModal
          total={tickets.length}
          loading={resetLoading}
          onConfirm={handleResetAll}
          onClose={() => setShowResetModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertCircle size={22} className="text-[hsl(0,66%,42%)]" /> ແຈ້ງ / ຕິດຕາມ ບັນຫາ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ຕິດຕາມ ແລະ ຈັດການ Ticket ບັນຫາລູກຄ້າ</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-1.5 pl-3 pr-1 border-r border-border">
              <CalendarDays size={13} className="text-muted-foreground flex-shrink-0" />
              <input
                type="month"
                value={exportMonth}
                onChange={e => setExportMonth(e.target.value)}
                className="py-2.5 text-sm text-foreground bg-transparent focus:outline-none w-[7.5rem]"
              />
              {exportMonth && (
                <button
                  onClick={() => setExportMonth("")}
                  title="ທັງໝົດ (ຍົກເລີກເດືອນ)"
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button onClick={exportToExcel} disabled={exporting}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 whitespace-nowrap border-r border-border"
              title="Export ສຳລັບໃຊ້ພາຍໃນ">
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {exportMonth ? "Export ເດືອນ" : "Export ທັງໝົດ"}
            </button>
            <button onClick={exportLtcFormat} disabled={exporting}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-[hsl(0,66%,42%)] hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Export ຕາມຟອມລາຍງານ LTC ສົ່ງຫົວໜ້າ">
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              ຟອມ LTC
            </button>
          </div>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> ນຳເຂົ້າ Excel
          </button>
          {isAdmin && tickets.length > 0 && (
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> ລຶບຂໍ້ມູນທັງໝົດ
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-semibold hover:bg-[hsl(0,66%,35%)] transition-colors shadow-sm">
            <Plus size={15} /> ແຈ້ງບັນຫາໃຫມ່
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="ທັງໝົດ" value={counts[""]} icon={TicketCheck} iconBg="bg-slate-500" textColor="text-foreground" />
        <StatCard label="Queued" value={counts.open} icon={AlertTriangle} iconBg="bg-blue-500" textColor="text-blue-600" />
        <StatCard label="In Progress" value={counts.in_progress} icon={Clock} iconBg="bg-amber-500" textColor="text-amber-600" />
        <StatCard label="Resolved" value={counts.resolved + counts.closed} icon={CheckCircle2} iconBg="bg-emerald-500" textColor="text-emerald-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {[
          { key: "all", label: "ທັງໝົດ", icon: List },
          { key: "daily", label: "ສະຫຼຸບລາຍວັນ", icon: CalendarDays },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === key ? "bg-white dark:bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === "all" && (
        <>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "", label: "ທັງໝົດ" },
              { key: "open", label: "Queued" },
              { key: "in_progress", label: "In Progress" },
              { key: "pending", label: "Pending" },
              { key: "resolved", label: "Resolved" },
              { key: "closed", label: "Closed" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}>
                {label}
                <span className={`text-[11px] font-bold px-1.5 rounded-full ${statusFilter === key ? "bg-white/20 text-white" : "bg-muted"}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາ ticket, ລູກຄ້າ, ໝວດຫມູ່..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-[hsl(0,66%,42%)] cursor-pointer" />
                <span className="text-xs text-muted-foreground">ເລືອກທັງໝົດ ({filtered.length})</span>
              </label>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-2 flex-wrap">
                  <span className="text-xs font-semibold text-[hsl(0,66%,42%)] bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                    ເລືອກ {selectedIds.size} ລາຍການ
                  </span>
                  <span className="text-xs text-muted-foreground">ປ່ຽນສະຖານະ:</span>
                  {[
                    { value: "open", label: "ເປີດ", color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                    { value: "in_progress", label: "ດຳເນີນງານ", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
                    { value: "resolved", label: "ແກ້ໄຂແລ້ວ", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
                    { value: "closed", label: "ປິດ", color: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200" },
                  ].map(({ value, label, color }) => (
                    <button key={value} onClick={() => handleBulkStatus(value)} disabled={bulkUpdating}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${color}`}>
                      {label}
                    </button>
                  ))}
                  <button onClick={handleBulkDelete} disabled={bulkUpdating}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1">
                    <Trash2 size={11} /> ລຶບ
                  </button>
                  {bulkUpdating && <RefreshCw size={13} className="animate-spin text-muted-foreground" />}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <TicketCheck size={36} className="opacity-30" />
              <p className="text-sm font-medium">ບໍ່ມີ Ticket ໃນຂະນະນີ້</p>
              <button onClick={() => setShowCreate(true)} className="text-xs text-[hsl(0,66%,42%)] font-medium hover:underline flex items-center gap-1">
                <Plus size={12} /> ສ້າງ Ticket ໃຫມ່
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map(t => {
                const cat = CATEGORIES.find(c => c.value === t.category);
                const CatIcon = cat?.icon ?? HelpCircle;
                const isSelected = selectedIds.has(t.id);
                return (
                  <div key={t.id} onClick={() => toggleSelect(t.id)}
                    className={`bg-card rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all cursor-pointer ${
                      isSelected ? "border-[hsl(0,66%,42%)] ring-1 ring-[hsl(0,66%,42%)]/30 bg-red-50/30" : "border-border"
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(t.id)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded accent-[hsl(0,66%,42%)] cursor-pointer flex-shrink-0" />
                        <div className={`w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ${cat?.color ?? "text-muted-foreground"}`}>
                          <CatIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                            <PriorityBadge priority={t.priority} />
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="font-semibold text-foreground text-sm mt-1">{t.category}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="font-semibold text-foreground text-xs">{t.customerName}</span>
                            {t.customerPhone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} /> {t.customerPhone}</div>}
                            {t.customerSpeed && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Wifi size={10} /> {t.customerSpeed}</div>}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={10} /> {t.reportedAt ? format(new Date(t.reportedAt), "dd/MM/yyyy") : format(parseISO(t.createdAt), "dd/MM/yyyy HH:mm")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:border-[hsl(0,66%,42%)]">
                          <option value="open">Queued</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending">Pending</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        {isAdmin && (
                          <button
                            onClick={() => setEditingTicket(t)}
                            title="ແກ້ໄຂ Ticket"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Page controls ────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
              <span className="text-xs text-muted-foreground">
                ສະແດງ {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} ຈາກ {filtered.length} ລາຍການ
              </span>
              <div className="flex items-center gap-1 sm:ml-auto flex-wrap">
                <button disabled={page === 1} onClick={() => setPage(1)}
                  className="px-2 py-1 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:bg-muted transition-colors">«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:bg-muted transition-colors">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          p === page
                            ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]"
                            : "border-border hover:bg-muted"
                        }`}>{p}</button>
                    )
                  )}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:bg-muted transition-colors">›</button>
                <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
                  className="px-2 py-1 rounded-lg text-xs font-medium border border-border disabled:opacity-40 hover:bg-muted transition-colors">»</button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "daily" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center bg-card rounded-2xl border border-border p-4">
            <CalendarDays size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">ຕົງວັນທີ:</span>
            <DateInput
              isoMode
              size="sm"
              value={dateFrom}
              onChange={setDateFrom}
            />
            <span className="text-muted-foreground text-sm">ຫາ</span>
            <DateInput
              isoMode
              size="sm"
              value={dateTo}
              onChange={setDateTo}
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1.5">
                <X size={12} /> ລ້າງ
              </button>
            )}
          </div>

          {dailyGroups.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <BarChart2 size={36} className="opacity-30" />
              <p className="text-sm font-medium">ບໍ່ມີຂໍ້ມູນ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyGroups.map(d => {
                const resolvedPct = d.total > 0 ? Math.round((d.resolved + d.closed) / d.total * 100) : 0;
                return (
                  <div key={d.date} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-[hsl(0,66%,42%)]" />
                        <span className="font-bold text-foreground text-sm">
                          {d.date ? format(new Date(d.date), "dd MMMM yyyy") : d.date}
                        </span>
                        <span className="text-xs text-muted-foreground">({d.total} ລາຍການ)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs text-muted-foreground">ແກ້ໄຂ</div>
                        <div className={`text-sm font-bold ${resolvedPct >= 80 ? "text-emerald-600" : resolvedPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {resolvedPct}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-border px-0">
                      {[
                        { label: "Queued", val: d.open, color: "text-blue-600" },
                        { label: "In Progress", val: d.in_progress, color: "text-amber-600" },
                        { label: "Resolved", val: d.resolved, color: "text-emerald-600" },
                        { label: "Closed", val: d.closed, color: "text-slate-500" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex flex-col items-center py-3 px-2">
                          <span className={`text-xl font-bold ${color}`}>{val}</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-1.5 bg-muted">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${resolvedPct}%` }} />
                    </div>
                    {d.tickets?.length > 0 && (
                      <div className="px-4 pb-3 pt-2 space-y-1.5">
                        {d.tickets.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TICKET_STATUS[t.status]?.dot ?? "bg-gray-400"}`} />
                            <span className="font-medium text-foreground">{t.customerName}</span>
                            <span>·</span>
                            <span>{t.category}</span>
                            <span>·</span>
                            <span>{t.description?.slice(0, 40)}{t.description?.length > 40 ? "…" : ""}</span>
                            <span className="ml-auto flex-shrink-0">
                              <StatusBadge status={t.status} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
