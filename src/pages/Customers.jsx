import { useState, useMemo } from "react";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";
import {
  useListCustomers, useListPackages, useUpdateCustomer,
  useDeleteCustomer, useDeleteManyCustomers, useGetDashboardSummary,
} from "@/lib/store";
import { useAuth } from "@/auth/AuthContext";
import { useSearch, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { DateInput, isoToDisplay as isoToDisplayUtil } from "@/components/DateInput";
import {
  Users, Search, X, Star, ChevronLeft, ChevronRight,
  Phone, MapPin, Calendar, Wifi, Edit2, Trash2, CheckCircle2,
  XCircle, PauseCircle, AlertTriangle, SlidersHorizontal,
  CheckSquare, Square, ShieldAlert, UserCheck,
  TrendingDown, Copy, Check,
  Gift, CalendarDays, Zap, Tag, AlertCircle,
  Eye, MessageSquare, RotateCcw,
} from "lucide-react";
import { format, parseISO, differenceInDays, differenceInMonths, parse, isValid, addMonths, subDays } from "date-fns";
import { getPrice, TOTAL_TO_PAID } from "@/lib/pricing";

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:    { label: "ໃຊ້ງານ",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  inactive:  { label: "ບໍ່ໃຊ້ງານ", cls: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-400",   icon: XCircle },
  suspended: { label: "ຖືກລະງັບ",   cls: "bg-amber-100 text-amber-700 border-amber-200",        dot: "bg-amber-500",   icon: PauseCircle },
  expired:   { label: "ໝົດອາຍຸ",    cls: "bg-red-100 text-red-700 border-red-200",             dot: "bg-red-500",     icon: AlertTriangle },
};

const FOLLOW_STATUSES = ["", "ຕ້ອງຕິດຕາມ", "ກຳລັງຕິດຕາມ", "ຕິດຕາມແລ້ວ", "ສຳເລັດ"];
const FOLLOW_STYLES = {
  "ຕ້ອງຕິດຕາມ": "bg-red-100 text-red-700 border-red-200",
  "ກຳລັງຕິດຕາມ": "bg-amber-100 text-amber-700 border-amber-200",
  "ຕິດຕາມແລ້ວ": "bg-blue-100 text-blue-700 border-blue-200",
  "ສຳເລັດ": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const DELETE_PIN = "1144";

// ─── Row background by status / expiry ─────────────────────────────────────────
function getRowStyle(customer) {
  if (!customer) return { bg: "", stripe: "bg-emerald-400/40" };
  const { status, expiryDate } = customer;
  if (status === "expired")   return { bg: "bg-red-100",   stripe: "bg-red-500" };
  if (status === "inactive")  return { bg: "bg-slate-100", stripe: "bg-slate-400" };
  if (status === "suspended") return { bg: "bg-amber-50",  stripe: "bg-amber-400" };
  if (status === "active" && expiryDate) {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days <= 7) return { bg: "bg-amber-100", stripe: "bg-amber-500" };
  }
  return { bg: "", stripe: "bg-emerald-400/50" };
}
function getRowBg(c) { return getRowStyle(c).bg; }

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status, onClick }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.inactive;
  return (
    <span
      onClick={onClick}
      title={onClick ? "ກົດເພື່ອກອງສະຖານະນີ້" : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.cls} ${onClick ? "cursor-pointer hover:opacity-75 transition-opacity select-none" : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) {
    return (
      <div className="space-y-0.5">
        <div className="text-xs text-muted-foreground">{format(parseISO(date), "dd/MM/yy")}</div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-md">
          ໝົດ {Math.abs(days)} ວັນ
        </span>
      </div>
    );
  }
  if (days === 0) {
    return (
      <div className="space-y-0.5">
        <div className="text-xs text-muted-foreground">{format(parseISO(date), "dd/MM/yy")}</div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md animate-pulse">
          ໝົດມື້ນີ້
        </span>
      </div>
    );
  }
  const color = days <= 3 ? "text-red-600 bg-red-50 border-red-200"
    : days <= 7 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{format(parseISO(date), "dd/MM/yy")}</div>
      <span className={`inline-flex text-[10px] font-semibold border px-1.5 py-0.5 rounded-md ${color}`}>
        ເຫຼືອ {days} ວັນ
      </span>
    </div>
  );
}

function TypeBadge({ code }) {
  const t = CUSTOMER_TYPES.find(x => x.code === code);
  if (!t) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-transparent ${t.track ?? "bg-muted"}`}
      style={{ color: t.textColor ?? "#555" }}
      title={t.label}
    >
      {t.emoji} {t.code}
    </span>
  );
}

function FollowBadge({ status }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${FOLLOW_STYLES[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function Avatar({ name, vip, size = "md" }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[hsl(0,66%,42%)] to-[hsl(0,66%,55%)] flex items-center justify-center text-white font-bold flex-shrink-0 relative shadow-sm`}>
      {initial}
      {vip && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
          <Star size={7} className="text-white fill-white" />
        </span>
      )}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handle} title="ຄັດລອກ"
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────────
function SummaryMiniCard({ label, value, icon: Icon, iconCls, valueCls, sub, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-sm transition-all select-none ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""} ${active ? "bg-[hsl(0,66%,42%)] border-[hsl(0,66%,35%)]" : "bg-card border-border/70"}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-white/20" : iconCls}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className={`text-xl sm:text-2xl font-extrabold leading-none ${active ? "text-white" : valueCls}`}>{value}</div>
        <div className={`text-[11px] font-semibold leading-tight mt-0.5 truncate ${active ? "text-white/80" : "text-muted-foreground"}`}>{label}</div>
        {sub && <div className={`text-[10px] mt-0.5 ${active ? "text-white/60" : "text-muted-foreground/70"}`}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Edit Modal helpers (mirrors AddCustomer) ──────────────────────────────────
const EDIT_SPEED_OPTIONS = [
  "35 Mbps", "55 Mbps", "70 Mbps", "80 Mbps",
  "100 Mbps", "120 Mbps", "160 Mbps", "170 Mbps",
  "180 Mbps", "300 Mbps", "320 Mbps", "400 Mbps", "420 Mbps", "480 Mbps",
];

const EDIT_DURATION_OPTIONS = [
  { label: "1 ເດືອນ",  totalMonths: 1,  paid: 1,  bonus: 0 },
  { label: "3 ເດືອນ",  sub: "ແຖມ 1 ເດືອນ", totalMonths: 4,  paid: 3,  bonus: 1 },
  { label: "6 ເດືອນ",  sub: "ແຖມ 2 ເດືອນ", totalMonths: 8,  paid: 6,  bonus: 2 },
  { label: "12 ເດືອນ", sub: "ແຖມ 4 ເດືອນ", totalMonths: 16, paid: 12, bonus: 4 },
];

const EDIT_FOLLOW_UP_STATUSES = ["", "ຕ້ອງຕິດຕາມ", "ກຳລັງຕິດຕາມ", "ຕິດຕາມແລ້ວ", "ສຳເລັດ"];
const EDIT_STEPS = ["ຂໍ້ມູນລູກຄ້າ", "ຕິດຕາມ & ໝາຍເຫດ"];

function editDisplayToDate(val) {
  if (!val) return null;
  const d = parse(val, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}
function editCalcExpiry(startStr, totalMonths) {
  const d = editDisplayToDate(startStr);
  if (!d || totalMonths <= 0) return "";
  return format(subDays(addMonths(d, totalMonths), 1), "dd/MM/yyyy");
}

function EditErrMsg({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-[11px] mt-0.5 font-medium">{msg}</p>;
}

// ─── Full Edit Modal ───────────────────────────────────────────────────────────
export function FullEditModal({ customer, packages, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const STANDARD_TOTAL_MONTHS = [1, 4, 8, 16];

  const originalTotalMonths = useMemo(() => {
    if (!customer.startDate || !customer.expiryDate) return null;
    try {
      const start = parseISO(customer.startDate);
      const expiry = parseISO(customer.expiryDate);
      const months = differenceInMonths(expiry, start);
      return STANDARD_TOTAL_MONTHS.reduce((best, m) =>
        Math.abs(m - months) < Math.abs(best - months) ? m : best
      );
    } catch { return null; }
  }, [customer.startDate, customer.expiryDate]);

  const [form, setForm] = useState({
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    customerType: customer.customerType ?? "IN",
    vip: customer.vip ?? false,
    speed: customer.speed ?? "",
    status: customer.status ?? "active",
    installationDate: isoToDisplayUtil(customer.installationDate),
    startDate: isoToDisplayUtil(customer.startDate),
    expiryDate: isoToDisplayUtil(customer.expiryDate),
    duration: 0,
    bonusMonthUsed: customer.bonusMonthUsed ?? false,
    followUpStatus: customer.followUpStatus ?? "",
    followUpPerson: customer.followUpPerson ?? "",
    remarks: customer.remarks ?? "",
  });

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === "startDate" && v) {
        if (updated.duration > 0) {
          const expiry = editCalcExpiry(v, updated.duration);
          if (expiry) updated.expiryDate = expiry;
        } else if (originalTotalMonths !== null) {
          const expiry = editCalcExpiry(v, originalTotalMonths);
          if (expiry) updated.expiryDate = expiry;
        } else {
          updated.expiryDate = "";
        }
      } else if (k === "duration" && updated.duration > 0) {
        const sd = updated.startDate;
        const expiry = editCalcExpiry(sd, updated.duration);
        if (expiry) updated.expiryDate = expiry;
      }
      return updated;
    });
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const setDuration = (totalMonths) => {
    setForm(f => {
      const expiry = f.startDate ? editCalcExpiry(f.startDate, totalMonths) : f.expiryDate;
      return { ...f, duration: totalMonths, expiryDate: expiry || f.expiryDate };
    });
    setErrors(e => ({ ...e, expiryDate: undefined }));
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "ກະລຸນາໃສ່ຊື່";
    if (!form.phone.trim() || !form.phone.split("/").every(p => /^\d+$/.test(p.trim().replace(/\s/g, "")) && p.trim().length > 0))
      errs.phone = "ເບີໂທບໍ່ຖືກຕ້ອງ (ຕົວເລກ, ຄັ່ນດ້ວຍ / ຖ້າຫຼາຍເບີ)";
    if (!form.startDate || !editDisplayToDate(form.startDate))
      errs.startDate = "ກະລຸນາໃສ່ວັນເລີ່ມໃຊ້ (DD/MM/YYYY)";
    if (!form.expiryDate || !editDisplayToDate(form.expiryDate))
      errs.expiryDate = "ກະລຸນາໃສ່ວັນໝົດ (DD/MM/YYYY)";
    return errs;
  };

  const handleNext = () => {
    if (step === 0) {
      const errs = validateStep0();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const startDate = editDisplayToDate(form.startDate);
    const expiryDate = editDisplayToDate(form.expiryDate);
    const installationDate = form.installationDate ? editDisplayToDate(form.installationDate) : null;
    if (!startDate || !expiryDate) { setSubmitError("ຮູບແບບວັນທີຜິດ"); return; }
    setSubmitting(true);
    try {
      await onSave({
        name: form.name,
        phone: form.phone,
        address: form.address || "—",
        city: form.city || undefined,
        customerType: form.customerType,
        vip: form.vip,
        speed: form.speed,
        status: form.status,
        installationDate: installationDate ? format(installationDate, "yyyy-MM-dd") : undefined,
        startDate: format(startDate, "yyyy-MM-dd"),
        expiryDate: format(expiryDate, "yyyy-MM-dd"),
        bonusMonthUsed: form.bonusMonthUsed,
        followUpStatus: form.followUpStatus || undefined,
        followUpPerson: form.followUpPerson || undefined,
        remarks: form.remarks || undefined,
      });
    } catch (e) {
      console.error("[FullEditModal] save error:", e);
      setSubmitError("ບັນທຶກບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl flex flex-col my-auto">

        {/* Header */}
        <div
          className="rounded-t-2xl p-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, hsl(0,66%,30%) 0%, hsl(0,66%,44%) 60%, hsl(0,60%,54%) 100%)" }}
        >
          <Avatar name={customer.name} vip={form.vip} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white tracking-wide truncate">{customer.name}</h2>
            <p className="text-sm text-white/75 font-mono">{customer.accountId} · ຂັ້ນຕອນ {step + 1}/{EDIT_STEPS.length} — {EDIT_STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white flex-shrink-0"><X size={20} /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 px-5 pt-4 pb-2">
          {EDIT_STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm ${
                  i < step ? "bg-emerald-500 text-white ring-2 ring-emerald-200"
                    : i === step ? "bg-[hsl(0,66%,42%)] text-white ring-2 ring-[hsl(0,66%,80%)]"
                    : "bg-muted text-muted-foreground border-2 border-border"
                }`}>
                  {i < step ? <CheckCircle2 size={15} /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${i === step ? "text-[hsl(0,66%,42%)]" : i < step ? "text-emerald-600" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < EDIT_STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${i < step ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="border-2 border-[hsl(0,66%,88%)] rounded-xl mx-4 mb-2 overflow-hidden">

            {/* ── Step 0: Customer Info ── */}
            {step === 0 && (
              <div className="p-5 space-y-5">

                {/* Personal Info */}
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-5 rounded-full bg-[hsl(0,66%,42%)]" />
                    <p className="text-[11px] font-bold text-[hsl(0,66%,42%)] uppercase tracking-widest">ຂໍ້ມູນສ່ວນຕົວ</p>
                    <div className="flex-1 h-px bg-[hsl(0,66%,90%)]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ຊື່ ແລະ ນາມສະກຸນ <span className="text-red-500">*</span></label>
                      <input
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background ${errors.name ? "border-red-400" : "border-border"}`}
                        value={form.name} onChange={e => set("name", e.target.value)} placeholder="ທ. / ນາງ ..."
                      />
                      <EditErrMsg msg={errors.name} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ເບີໂທ <span className="text-red-500">*</span></label>
                      <input
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background ${errors.phone ? "border-red-400" : "border-border"}`}
                        value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="020XXXXXXXX ຫຼື 020XXX/030XXX" inputMode="tel"
                      />
                      <EditErrMsg msg={errors.phone} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ປະເພດລູກຄ້າ</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                        value={form.customerType} onChange={e => set("customerType", e.target.value)}>
                        {CUSTOMER_TYPES.map(t => <option key={t.code} value={t.code}>{t.emoji} {t.code} – {t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ສະຖານະ</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                        value={form.status} onChange={e => set("status", e.target.value)}>
                        <option value="active">ໃຊ້ງານ</option>
                        <option value="inactive">ບໍ່ໃຊ້ງານ</option>
                        <option value="suspended">ຖືກລະງັບ</option>
                        <option value="expired">ໝົດອາຍຸ</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ທີ່ຢູ່</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                        value={form.address} onChange={e => set("address", e.target.value)} placeholder="ບ້ານ, ເມືອງ, ແຂວງ" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ເມືອງ/ແຂວງ</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                        value={form.city} onChange={e => set("city", e.target.value)} placeholder="ໄຊ, ອຸດົມໄຊ..." />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">VIP</label>
                      <button type="button" onClick={() => set("vip", !form.vip)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.vip ? "border-amber-400 bg-amber-50 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300"}`}>
                        <Star size={13} className={form.vip ? "fill-amber-400 text-amber-400" : ""} />
                        {form.vip ? "VIP" : "ປົກກະຕິ"}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Speed (editable) */}
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-5 rounded-full bg-amber-500" />
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">ຄວາມໄວອິນເຕີເນັດ (Speed)</p>
                    <div className="flex-1 h-px bg-amber-100" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {EDIT_SPEED_OPTIONS.map(spd => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => set("speed", spd)}
                        className={`py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                          form.speed === spd
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-amber-300 hover:text-amber-700"
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                  {!form.speed && (
                    <p className="text-red-500 text-[11px] mt-1.5 font-medium">ກະລຸນາເລືອກຄວາມໄວ</p>
                  )}
                </section>

                {/* Dates & Duration */}
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-5 rounded-full bg-blue-500" />
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">ວັນທີ &amp; ໄລຍະການໃຊ້ງານ</p>
                    <div className="flex-1 h-px bg-blue-100" />
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ວັນເລີ່ມໃຊ້ <span className="text-red-500">*</span></label>
                        <DateInput value={form.startDate} onChange={v => set("startDate", v)} error={!!errors.startDate} />
                        <EditErrMsg msg={errors.startDate} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ວັນຕິດຕັ້ງ</label>
                        <DateInput value={form.installationDate} onChange={v => set("installationDate", v)} placeholder="DD/MM/YYYY (ຖ້າມີ)" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ໄລຍະການຊື້</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {EDIT_DURATION_OPTIONS.map(opt => {
                          const price = form.speed ? getPrice(form.speed, opt.paid) : null;
                          const isSelected = form.duration === opt.totalMonths ||
                            (form.duration === 0 && originalTotalMonths === opt.totalMonths);
                          return (
                            <button
                              key={opt.totalMonths}
                              type="button"
                              onClick={() => setDuration(opt.totalMonths)}
                              className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 transition-all text-center ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-border bg-background hover:border-blue-300"
                              }`}
                            >
                              <span className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-foreground"}`}>
                                {opt.label}
                              </span>
                              {opt.bonus > 0 && (
                                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                                  <Gift size={8} strokeWidth={2.5} /> {opt.sub}
                                </span>
                              )}
                              {price != null && (
                                <span className={`text-[10px] font-bold tabular-nums mt-0.5 ${isSelected ? "text-[hsl(0,66%,42%)]" : "text-muted-foreground"}`}>
                                  {price.toLocaleString("en-US")} ₭
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">
                        ວັນໝົດສັນຍາ <span className="text-red-500">*</span>
                        {form.duration > 0 && form.expiryDate && (
                          <span className="ml-2 text-emerald-600 text-[10px] normal-case font-normal">(ຄຳນວນອັດຕະໂນມັດ)</span>
                        )}
                      </label>
                      <DateInput
                        value={form.expiryDate}
                        onChange={v => { set("expiryDate", v); setForm(f => ({ ...f, duration: 0 })); }}
                        error={!!errors.expiryDate}
                        className={form.duration > 0 && form.expiryDate ? "border-emerald-400 bg-emerald-50/50" : ""}
                      />
                      <EditErrMsg msg={errors.expiryDate} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── Step 1: Follow-up & Remarks ── */}
            {step === 1 && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">ຕິດຕາມ &amp; ໝາຍເຫດ</p>
                  <div className="flex-1 h-px bg-emerald-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ສະຖານະຕິດຕາມ</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                      value={form.followUpStatus} onChange={e => set("followUpStatus", e.target.value)}>
                      {EDIT_FOLLOW_UP_STATUSES.map(s => <option key={s} value={s}>{s || "— ບໍ່ມີ —"}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ຜູ້ຕິດຕາມ</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                      value={form.followUpPerson} onChange={e => set("followUpPerson", e.target.value)} placeholder="ຊື່ຜູ້ຕິດຕາມ..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ໝາຍເຫດ</label>
                    <textarea className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background resize-none"
                      rows={3} value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="ໝາຍເຫດເພີ່ມເຕີມ..." />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-4 py-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">ເດືອນແຖມ</label>
                    <button type="button" onClick={() => set("bonusMonthUsed", !form.bonusMonthUsed)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.bonusMonthUsed ? "border-slate-300 bg-slate-100 text-slate-500" : "border-green-400 bg-green-50 text-green-700"}`}>
                      <Gift size={14} />
                      {form.bonusMonthUsed ? "ໃຊ້ແລ້ວ" : "ຍັງບໍ່ໃຊ້"}
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl p-4 border border-[hsl(0,66%,85%)]"
                  style={{ background: "linear-gradient(135deg, hsl(0,66%,98%) 0%, hsl(0,30%,97%) 100%)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={14} className="text-[hsl(0,66%,42%)]" />
                    <p className="text-[11px] font-bold text-[hsl(0,66%,42%)] uppercase tracking-widest">ສະຫຼຸບຂໍ້ມູນ</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { l: "ຊື່", v: form.name },
                      { l: "ເບີໂທ", v: form.phone },
                      { l: "ຄວາມໄວ", v: form.speed },
                      { l: "ວັນເລີ່ມໃຊ້", v: form.startDate },
                      { l: "ວັນໝົດ", v: form.expiryDate },
                      { l: "ສະຖານະ", v: form.status === "active" ? "ໃຊ້ງານ" : form.status === "inactive" ? "ບໍ່ໃຊ້ງານ" : form.status === "suspended" ? "ຖືກລະງັບ" : "ໝົດອາຍຸ" },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{l}</span>
                        <span className="font-semibold text-foreground text-xs">{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg text-sm">
                    <AlertCircle size={15} /> {submitError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t-2 border-[hsl(0,66%,90%)] flex justify-between items-center rounded-b-2xl"
          style={{ background: "linear-gradient(to right, hsl(0,66%,99%), hsl(0,10%,98%))" }}>
          <button
            onClick={() => step === 0 ? onClose() : setStep(step - 1)}
            className="px-5 py-2.5 rounded-lg border-2 border-border text-sm font-semibold hover:bg-muted hover:border-[hsl(0,66%,70%)] transition-all">
            {step === 0 ? "ຍົກເລີກ" : "← ກັບຄືນ"}
          </button>
          {step === 0 ? (
            <button onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, hsl(0,66%,36%) 0%, hsl(0,66%,48%) 100%)" }}>
              ໜ້າຕໍ່ໄປ <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, hsl(145,60%,30%) 0%, hsl(145,60%,42%) 100%)" }}>
              {submitting
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> ກຳລັງບັນທຶກ...</>
                : <><CheckCircle2 size={16} /> ຢືນຢັນ ແລະ ບັນທຶກ</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep alias for internal usage
const EditModal = FullEditModal;

// ─── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ customer, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 size={24} className="text-red-600" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-lg">ຢືນຢັນການລຶບ</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ທ່ານຕ້ອງການລຶບລູກຄ້າ <span className="font-semibold text-foreground">"{customer.name}"</span> ຫຼືບໍ່?{" "}
            ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນຄືນໄດ້.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            ຍົກເລີກ
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
            ລຶບ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Delete Modal ─────────────────────────────────────────────────────────
function BulkDeleteModal({ mode, count, total, onClose, onConfirm, loading, mutationError }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const isDeleteAll = mode === "all";

  const handleConfirm = () => {
    if (pin !== DELETE_PIN) { setError("ລະຫັດບໍ່ຖືກຕ້ອງ ກະລຸນາລອງໃໝ່"); setPin(""); return; }
    setError("");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert size={26} className="text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">
              {isDeleteAll ? "ລຶບລູກຄ້າທັງໝົດ" : `ລຶບ ${count} ລາຍການ`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isDeleteAll
                ? `ຈະລຶບລູກຄ້າທັງໝົດ ${total.toLocaleString()} ຄົນ. ບໍ່ສາມາດຍ້ອນຄືນໄດ້!`
                : `ຈະລຶບ ${count} ລາຍການທີ່ເລືອກ. ບໍ່ສາມາດຍ້ອນຄືນໄດ້!`}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-red-700 font-semibold">ກະລຸນາໃສ່ລະຫັດຢືນຢັນຂອງ Admin</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">ລະຫັດຢືນຢັນ</label>
          <input type="password" value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleConfirm()}
            placeholder="ໃສ່ລະຫັດ..." maxLength={10} autoFocus
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-center tracking-widest font-bold focus:outline-none transition-colors ${(error || mutationError) ? "border-red-400 bg-red-50" : "border-border bg-background focus:border-red-500"}`}
          />
          {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
          {mutationError && !error && (
            <p className="text-xs text-red-600 mt-1.5 font-medium">
              ເກີດຂໍ້ຜິດພາດ: {mutationError?.message ?? "ບໍ່ສາມາດລຶບໄດ້ ກະລຸນາລອງໃໝ່"}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            ຍົກເລີກ
          </button>
          <button onClick={handleConfirm} disabled={loading || !pin}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isDeleteAll ? "ລຶບທັງໝົດ" : "ລຶບທີ່ເລືອກ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ customer, onClose }) {
  const fld = (label, value) => (
    <div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-foreground font-medium min-h-[1.25rem]">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border bg-muted/30">
          <Avatar name={customer.name} vip={customer.vip} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-foreground text-base leading-tight truncate">{customer.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-sm text-[hsl(0,66%,42%)] font-bold">{customer.accountId ?? "—"}</span>
              {customer.vip && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0 rounded-full">VIP</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4">
          {fld("ສະຖານະ", <StatusBadge status={customer.status} />)}
          {fld("ປະເພດ", <TypeBadge code={customer.customerType} />)}
          {fld("ເບີໂທ", customer.phone)}
          {fld("ຄວາມໄວ", customer.speed)}
          {fld("ທີ່ຢູ່", customer.address)}
          {fld("ຕິດຕາມ", <FollowBadge status={customer.followUpStatus} />)}
          {fld("ວັນເລີ່ມ", customer.startDate ? format(parseISO(customer.startDate), "dd/MM/yyyy") : null)}
          {fld("ວັນໝົດ", <ExpiryBadge date={customer.expiryDate} />)}
          {customer.remarks && (
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">ໝາຍເຫດ</div>
              <div className="text-sm text-foreground bg-muted/40 rounded-xl px-3 py-2">{customer.remarks}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Renew Modal ──────────────────────────────────────────────────────────
function QuickRenewModal({ customer, onClose, onSave }) {
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const BONUS = { 1: 0, 3: 1, 6: 2, 12: 4 };
  const totalMonths = months + (BONUS[months] ?? 0);
  const newExpiry = subDays(addMonths(new Date(), totalMonths), 1);

  const handleConfirm = async () => {
    setSaving(true);
    await onSave({ expiryDate: format(newExpiry, "yyyy-MM-dd"), status: "active" });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <RotateCcw size={16} className="text-emerald-600" /> ຕໍ່ສັນຍາ
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="bg-muted/30 rounded-xl px-4 py-3">
          <div className="font-bold text-foreground text-sm">{customer.name}</div>
          {customer.expiryDate && (
            <div className="text-xs text-muted-foreground mt-0.5">
              ໝົດອາຍຸປັດຈຸບັນ: <span className="font-semibold">{format(parseISO(customer.expiryDate), "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">ເລືອກໄລຍະ (ຈາກວັນນີ້)</div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 3, 6, 12].map(m => (
              <button key={m} onClick={() => setMonths(m)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${months === m ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "border-border text-foreground hover:bg-muted"}`}
              >
                {m}ດ
                {BONUS[m] > 0 && <div className="text-[9px] opacity-75">+{BONUS[m]}ໂ</div>}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <span className="text-emerald-700 text-sm font-medium">ໝົດອາຍຸໃໝ່: </span>
          <span className="text-emerald-800 font-bold text-sm">{format(newExpiry, "dd/MM/yyyy")}</span>
          <span className="text-emerald-600 text-xs ml-1">({totalMonths} ເດືອນ)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">ຍົກເລີກ</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            ຢືນຢັນ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, setLocation] = useLocation();

  const searchStr = useSearch();
  const initParams = useMemo(() => {
    const p = new URLSearchParams(searchStr);
    return {
      status: p.get("status") ?? "",
      vip:    p.get("vip") === "true",
      safe:   p.get("safe") === "true",
      speed:  p.get("speed") ?? "",
      type:   p.get("type") ?? "",
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initParams.status);
  const [customerType, setCustomerType] = useState(initParams.type);
  const [vipOnly, setVipOnly] = useState(initParams.vip);
  const [speed, setSpeed] = useState(initParams.speed);
  const [showFilters, setShowFilters] = useState(
    !!(initParams.speed || initParams.status || initParams.type)
  );
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(null);
  const [safeOnly, setSafeOnly] = useState(initParams.safe);
  const PAGE_SIZE = 20;

  const params = useMemo(() => ({
    page: search ? 1 : page,
    pageSize: search ? 99999 : PAGE_SIZE,
    search: search || undefined,
    status: safeOnly ? undefined : (status || undefined),
    safe: safeOnly ? true : undefined,
    customerType: customerType || undefined,
    vip: vipOnly ? true : undefined,
    speed: speed || undefined,
  }), [page, search, status, safeOnly, customerType, vipOnly, speed]);

  const { data, isLoading } = useListCustomers(params);
  const { data: packages } = useListPackages();
  const { data: summary } = useGetDashboardSummary();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const deleteMany = useDeleteManyCustomers();
  const qc = useQueryClient();

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const allPageSelected = customers.length > 0 && customers.every(c => selectedIds.has(c.id));
  const somePageSelected = customers.some(c => selectedIds.has(c.id));
  const hasFilters = !!(status || customerType || vipOnly || speed || safeOnly);

  // ── Handlers ──
  const handleSearch = (v) => { setSearch(v); setPage(1); };
  const handleStatus = (v) => { setStatus(v); setPage(1); setSafeOnly(false); };
  const handleType = (v) => { setCustomerType(v); setPage(1); };
  const handleVip = (v) => { setVipOnly(v); setPage(1); };
  const handleSpeed = (v) => { setSpeed(v); setPage(1); };
  const clearAll = () => { handleSearch(""); handleStatus(""); handleType(""); handleVip(false); handleSpeed(""); setSafeOnly(false); };

  const handleSave = async (form) => {
    await updateCustomer.mutateAsync({ id: editTarget.id, data: form });
    setEditTarget(null);
    qc.invalidateQueries();
  };
  const handleDelete = () => {
    deleteCustomer.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { setDeleteTarget(null); qc.invalidateQueries(); },
    });
  };
  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); customers.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); customers.forEach(c => n.add(c.id)); return n; });
    }
  };
  const handleBulkDelete = () => {
    deleteMany.mutate(
      { ids: Array.from(selectedIds), deleteAll: bulkDeleteMode === "all" },
      { onSuccess: () => { setBulkDeleteMode(null); setSelectedIds(new Set()); qc.invalidateQueries(); } }
    );
  };
  const handleRenewSave = (form) => {
    updateCustomer.mutate({ id: renewTarget.id, data: form }, {
      onSuccess: () => { setRenewTarget(null); qc.invalidateQueries(); },
    });
  };

  // ── Summary stats ──
  const totalCount = summary?.totalCustomers ?? 0;
  const activeCount = summary?.safeCustomers ?? 0;
  const expiringCount = summary?.expiringSoon ?? 0;
  const expiredCount = summary?.expiredCustomers ?? 0;
  const vipCount = summary?.vipCustomers ?? 0;

  return (
    <div className="p-3 sm:p-5 space-y-4">
      {/* ── Modals ── */}
      {editTarget && (
        <EditModal customer={editTarget} packages={packages ?? []}
          onClose={() => setEditTarget(null)} onSave={handleSave} />
      )}
      {deleteTarget && (
        <DeleteModal customer={deleteTarget}
          onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
      {bulkDeleteMode && (
        <BulkDeleteModal mode={bulkDeleteMode} count={selectedIds.size} total={total}
          loading={deleteMany.isPending} mutationError={deleteMany.error}
          onClose={() => { setBulkDeleteMode(null); deleteMany.reset(); }}
          onConfirm={handleBulkDelete} />
      )}
      {renewTarget && (
        <QuickRenewModal customer={renewTarget}
          onClose={() => setRenewTarget(null)} onSave={handleRenewSave} />
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users size={22} className="text-[hsl(0,66%,42%)]" />
            ລູກຄ້າທັງໝົດ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ພົບ <span className="font-bold text-foreground">{total.toLocaleString()}</span> ລາຍການ
            {(search || hasFilters) && (
              <button onClick={clearAll} className="ml-2 text-xs text-[hsl(0,66%,42%)] font-semibold hover:underline">
                (ລ້າງຕົວກອງ)
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setBulkDeleteMode("all")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium transition-colors"
              title="ລຶບລູກຄ້າທັງໝົດ">
              <ShieldAlert size={14} /> ລຶບທັງໝົດ
            </button>
          )}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasFilters ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]" : "border-border text-muted-foreground hover:bg-muted"}`}>
            <SlidersHorizontal size={14} />
            ຕົວກອງ
            {hasFilters && <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 rounded-full">!</span>}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <SummaryMiniCard label="ທັງໝົດ" value={totalCount.toLocaleString()}
          icon={Users} iconCls="bg-indigo-500" valueCls="text-foreground"
          active={!status && !vipOnly}
          onClick={() => { handleStatus(""); handleVip(false); }} />
        <SummaryMiniCard label="ໃຊ້ງານ (ປົກກະຕິ)" value={activeCount.toLocaleString()}
          icon={CheckCircle2} iconCls="bg-emerald-500" valueCls="text-emerald-700"
          sub={totalCount > 0 ? `${Math.round(activeCount / totalCount * 100)}%` : ""}
          active={safeOnly}
          onClick={() => { if (safeOnly) { setSafeOnly(false); } else { setSafeOnly(true); setStatus(""); handleVip(false); } setPage(1); }} />
        <SummaryMiniCard label="ໃກ້ໝົດ (≤7ວ)" value={expiringCount.toLocaleString()}
          icon={AlertTriangle} iconCls="bg-amber-500" valueCls="text-amber-700"
          onClick={() => setLocation("/tracking")} />
        <SummaryMiniCard label="ໝົດອາຍຸ" value={expiredCount.toLocaleString()}
          icon={TrendingDown} iconCls="bg-[hsl(0,66%,42%)]" valueCls="text-red-700"
          active={status === "expired"}
          onClick={() => { handleStatus(status === "expired" ? "" : "expired"); handleVip(false); }} />
        <SummaryMiniCard label="VIP" value={vipCount.toLocaleString()}
          icon={Star} iconCls="bg-amber-400" valueCls="text-amber-700"
          sub={totalCount > 0 ? `${Math.round(vipCount / totalCount * 100)}%` : ""}
          active={vipOnly}
          onClick={() => { handleVip(!vipOnly); handleStatus(""); }} />
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="ຄົ້ນຫາ ຊື່, ເບີໂທ, ທີ່ຢູ່, ລະຫັດ Account..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors"
        />
        {search && (
          <button onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="bg-muted/40 rounded-2xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">ສະຖານະ</label>
              <select value={status} onChange={e => handleStatus(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                <option value="">ທັງໝົດ</option>
                {Object.entries(STATUS_MAP).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">ປະເພດ</label>
              <select value={customerType} onChange={e => handleType(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]">
                <option value="">ທັງໝົດ</option>
                {CUSTOMER_TYPES.map(t => <option key={t.code} value={t.code}>{t.emoji} {t.code} – {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">ຄວາມໄວ</label>
              <div className="relative">
                <input type="text" value={speed} onChange={e => handleSpeed(e.target.value)}
                  placeholder="ເຊັ່ນ: 35Mbps"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] pr-8" />
                {speed && (
                  <button onClick={() => handleSpeed("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={vipOnly} onChange={e => handleVip(e.target.checked)}
                  className="w-4 h-4 accent-[hsl(0,66%,42%)]" />
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Star size={13} className="text-amber-500" /> VIP ເທົ່ານັ້ນ
                </span>
              </label>
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
              <X size={12} /> ລ້າງຕົວກອງທັງໝົດ
            </button>
          )}
        </div>
      )}

      {/* ── Bulk selection bar ── */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <CheckSquare size={16} />
            ເລືອກແລ້ວ {selectedIds.size} ລາຍການ
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
              ຍົກເລີກ
            </button>
            <button onClick={() => setBulkDeleteMode("selected")}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 size={13} /> ລຶບທີ່ເລືອກ ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ສີຕາຕະລາງ:</span>
        {[
          { bg: "bg-white border border-border", label: "Active ປົກກະຕິ" },
          { bg: "bg-amber-50", label: "ໃກ້ໝົດ ≤ 7 ວັນ" },
          { bg: "bg-red-50", label: "ໝົດອາຍຸ" },
          { bg: "bg-slate-50", label: "Inactive / Suspended" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded ${l.bg} flex-shrink-0`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Table / Cards ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm gap-2">
            <div className="w-5 h-5 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
            ກຳລັງໂຫລດ...
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Users size={28} className="opacity-30" />
            </div>
            <p className="text-sm font-semibold">ບໍ່ພົບລູກຄ້າ</p>
            <p className="text-xs text-muted-foreground">ລອງປ່ຽນ keyword ຫຼື ລ້າງຕົວກອງ</p>
            {(search || hasFilters) && (
              <button onClick={clearAll}
                className="text-xs text-[hsl(0,66%,42%)] font-semibold hover:underline">
                ລ້າງການຄົ້ນຫາ
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {isAdmin && (
                      <th className="px-4 py-3.5 w-10">
                        <button onClick={toggleSelectAll}
                          className="text-muted-foreground hover:text-[hsl(0,66%,42%)] transition-colors">
                          {allPageSelected
                            ? <CheckSquare size={16} className="text-[hsl(0,66%,42%)]" />
                            : somePageSelected
                              ? <div className="w-4 h-4 border-2 border-[hsl(0,66%,42%)] rounded bg-red-100 flex items-center justify-center"><div className="w-2 h-0.5 bg-[hsl(0,66%,42%)]" /></div>
                              : <Square size={16} />}
                        </button>
                      </th>
                    )}
                    {[
                      { label: "", cls: "w-1 p-0" },
                      { label: "#", cls: "w-10 text-center" },
                      { label: "ລູກຄ້າ", cls: "min-w-[160px]" },
                      { label: "Account ID", cls: "w-36 text-[hsl(0,66%,42%)]" },
                      { label: "ເບີໂທ", cls: "w-32" },
                      { label: "ທີ່ຢູ່", cls: "min-w-[120px]" },
                      { label: "ປະເພດ", cls: "w-24" },
                      { label: "ຄວາມໄວ", cls: "w-24" },
                      { label: "ວັນເລີ່ມ", cls: "w-28" },
                      { label: "ໝົດອາຍຸ", cls: "w-32" },
                      { label: "ສະຖານະ", cls: "w-28" },
                      { label: "ຕິດຕາມ", cls: "w-28" },
                      { label: "ຜູ້ຕິດຕາມ", cls: "w-28" },
                    ].map(h => (
                      <th key={h.label}
                        className={`text-left px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap ${h.cls} ${h.label === "Account ID" ? "text-[hsl(0,66%,42%)]" : "text-muted-foreground"}`}>
                        {h.label}
                      </th>
                    ))}
                    <th className="sticky right-0 z-20 bg-muted/50 px-3 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap w-44 text-center border-l border-border/40">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customers.map((c, i) => {
                    const isSelected = selectedIds.has(c.id);
                    const { bg: rowBg, stripe } = getRowStyle(c);
                    return (
                      <tr key={c.id}
                        className={`group transition-colors ${isSelected ? "bg-red-100/70" : rowBg || "hover:bg-muted/20"}`}>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => toggleSelect(c.id)}
                              className="text-muted-foreground hover:text-[hsl(0,66%,42%)] transition-colors">
                              {isSelected
                                ? <CheckSquare size={16} className="text-[hsl(0,66%,42%)]" />
                                : <Square size={16} />}
                            </button>
                          </td>
                        )}
                        <td className="p-0 w-1">
                          <div className={`w-1 h-full min-h-[48px] ${stripe} rounded-r`} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono tabular-nums text-center">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.name} vip={c.vip} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-0.5">
                                <div className="font-bold text-foreground text-sm leading-tight truncate max-w-[130px]" title={c.name}>
                                  {c.name}
                                </div>
                                <CopyBtn text={c.name} />
                              </div>
                              {c.vip && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0 rounded-full mt-0.5">
                                  <Star size={7} className="fill-amber-500 text-amber-500" /> VIP
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-[hsl(0,66%,42%)] text-sm tracking-wide">{c.accountId ?? "—"}</span>
                            {c.accountId && <CopyBtn text={c.accountId} />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {(c.phone ?? "").split("/").filter(Boolean).map((p, i) => (
                              <span key={i} className="text-xs text-foreground font-mono whitespace-nowrap">{p.trim()}</span>
                            ))}
                            {!c.phone && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground truncate block max-w-[130px]" title={c.address}>
                            {c.address ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge code={c.customerType} />
                        </td>
                        <td className="px-4 py-3">
                          {c.speed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(0,66%,42%)] bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                              <Wifi size={9} /> {c.speed}
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {c.startDate
                            ? <span className="text-xs text-muted-foreground font-mono">{format(parseISO(c.startDate), "dd/MM/yy")}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <ExpiryBadge date={c.expiryDate} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} onClick={() => handleStatus(c.status === status ? "" : c.status)} />
                        </td>
                        <td className="px-4 py-3">
                          <FollowBadge status={c.followUpStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground truncate block max-w-[100px]" title={c.followUpPerson}>
                            {c.followUpPerson
                              ? <span className="flex items-center gap-1"><UserCheck size={10} className="flex-shrink-0" />{c.followUpPerson}</span>
                              : "—"}
                          </span>
                        </td>
                        <td className={`sticky right-0 z-10 px-2 py-3 border-l border-border/40 ${isSelected ? "bg-red-100" : rowBg || "bg-card"}`}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                            <button onClick={() => setLocation(`/customers/${c.id}`)} title="ເບິ່ງລາຍລະອຽດ"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <Eye size={13} />
                            </button>
                            <button onClick={() => {
                              sessionStorage.setItem("tracking_init_search", c.name ?? "");
                              setLocation("/tracking");
                            }} title="ແຈ້ງບັນຫາ / ຕິດຕາມ"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-50 transition-colors">
                              <MessageSquare size={13} />
                            </button>
                            <button onClick={() => setRenewTarget(c)} title="ຕໍ່ສັນຍາ"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <RotateCcw size={13} />
                            </button>
                            <button onClick={() => setEditTarget(c)} title="ແກ້ໄຂ"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => setDeleteTarget(c)} title="ລຶບ"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="md:hidden divide-y divide-border/60">
              {customers.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const { bg: rowBg, stripe } = getRowStyle(c);
                return (
                  <div key={c.id}
                    className={`flex transition-colors ${isSelected ? "bg-red-50/70" : rowBg}`}>
                    <div className={`w-1 flex-shrink-0 ${stripe}`} />
                  <div className="flex-1 px-4 py-4">
                    <div className="flex items-start gap-3">
                      {isAdmin && (
                        <button onClick={() => toggleSelect(c.id)}
                          className="mt-1 text-muted-foreground hover:text-[hsl(0,66%,42%)] flex-shrink-0">
                          {isSelected
                            ? <CheckSquare size={16} className="text-[hsl(0,66%,42%)]" />
                            : <Square size={16} />}
                        </button>
                      )}
                      <Avatar name={c.name} vip={c.vip} size="md" />
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-0.5">
                              <div className="font-bold text-foreground text-sm leading-tight">{c.name}</div>
                              <CopyBtn text={c.name} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-bold text-[hsl(0,66%,42%)] text-xs tracking-wide">{c.accountId}</span>
                              {c.accountId && <CopyBtn text={c.accountId} />}
                              {c.vip && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0 rounded-full">
                                  <Star size={7} className="fill-amber-500 text-amber-500" /> VIP
                                </span>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={c.status} />
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Phone size={10} className="flex-shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                              {(c.phone ?? "").split("/").filter(Boolean).map((p, i) => (
                                <span key={i} className="font-mono">{p.trim()}</span>
                              ))}
                              {!c.phone && <span>—</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Wifi size={10} className="flex-shrink-0 text-[hsl(0,66%,42%)]" />
                            <span className="font-bold text-[hsl(0,66%,42%)]">{c.speed ?? "—"}</span>
                          </div>
                          {c.address && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
                              <MapPin size={10} className="flex-shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar size={10} className="flex-shrink-0" />
                            <ExpiryBadge date={c.expiryDate} />
                          </div>
                          <div className="flex items-center gap-1">
                            <TypeBadge code={c.customerType} />
                          </div>
                        </div>

                        {/* Follow-up row */}
                        {(c.followUpStatus || c.followUpPerson) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.followUpStatus && <FollowBadge status={c.followUpStatus} />}
                            {c.followUpPerson && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <UserCheck size={10} /> {c.followUpPerson}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          <button onClick={() => setLocation(`/customers/${c.id}`)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors">
                            <Eye size={11} /> ລາຍລະອຽດ
                          </button>
                          <button onClick={() => {
                              sessionStorage.setItem("tracking_init_search", c.name ?? "");
                              setLocation("/tracking");
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-semibold hover:bg-orange-100 transition-colors">
                            <MessageSquare size={11} /> ຕິດຕາມ
                          </button>
                          <button onClick={() => setRenewTarget(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                            <RotateCcw size={11} /> ຕໍ່ສັນຍາ
                          </button>
                          <button onClick={() => setEditTarget(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
                            <Edit2 size={11} /> ແກ້ໄຂ
                          </button>
                          <button onClick={() => setDeleteTarget(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
                            <Trash2 size={11} /> ລຶບ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && !search && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  ໜ້າ <span className="font-bold text-foreground">{page}</span> / {totalPages}
                  {" · "}<span className="font-semibold text-foreground">{total.toLocaleString()}</span> ລາຍການທັງໝົດ
                </span>
                <span className="text-xs text-muted-foreground sm:hidden">
                  {page} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page ? "bg-[hsl(0,66%,42%)] text-white shadow-sm" : "border border-border text-muted-foreground hover:bg-muted"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <ChevronRight size={15} />
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
