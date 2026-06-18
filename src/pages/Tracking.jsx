import { useState, useMemo, useEffect, useRef } from "react";
import { useUpdateCustomer, useListPackages, useCreatePayment } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, customerFromDb } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import {
  Activity, Search, X, Star, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, XCircle, Phone, MapPin, Wifi,
  RefreshCw, UserCheck, MessageSquare, Calendar, Save,
  AlertTriangle, Users, RotateCcw, PhoneCall, PhoneMissed,
  ThumbsDown, HelpCircle, Gift, CalendarDays, Edit2, Copy, Check,
  Download, FileSpreadsheet, BarChart2, CalendarClock, Wallet, Loader2,
} from "lucide-react";
import { FullEditModal } from "./Customers";
import { format, parseISO, differenceInDays, formatDistanceToNow, addMonths, subDays, addDays } from "date-fns";
import { DateInput } from "@/components/DateInput";

const PERIOD_TABS = [
  { key: "expiring",  label: "ໃກ້ໝົດ (≤1ເດືອນ)",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300",  dot: "bg-amber-500" },
  { key: "expired_1", label: "ໝົດ ≤6 ເດືອນ",      color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-500" },
  { key: "expired_2", label: "ໝົດ 6-12 ເດືອນ",    color: "text-red-700",    bg: "bg-red-50",    border: "border-red-300",    dot: "bg-red-500" },
  { key: "expired_3", label: "ໝົດ 12+ ເດືອນ",     color: "text-red-900",   bg: "bg-red-100",   border: "border-red-400",    dot: "bg-red-800" },
  { key: "all",       label: "ທັງໝົດ",             color: "text-foreground", bg: "bg-muted",     border: "border-border",     dot: "bg-slate-500" },
];

const FOLLOW_STEPS = [
  { value: "ຕ້ອງຕິດຕາມ",   label: "ຕ້ອງຕິດຕາມ",   short: "ຕ້ອງຕິດຕາມ",   cls: "bg-red-500",     text: "text-red-700",    light: "bg-red-100 border-red-200 text-red-700" },
  { value: "ກຳລັງຕິດຕາມ", label: "ກຳລັງຕິດຕາມ", short: "ກຳລັງຕິດຕາມ", cls: "bg-amber-500",   text: "text-amber-700",  light: "bg-amber-100 border-amber-200 text-amber-700" },
  { value: "ຕິດຕາມແລ້ວ",   label: "ຕິດຕາມແລ້ວ",   short: "ຕິດຕາມແລ້ວ",   cls: "bg-blue-500",    text: "text-blue-700",   light: "bg-blue-100 border-blue-200 text-blue-700" },
  { value: "ສຳເລັດ",       label: "ສຳເລັດ",         short: "ສຳເລັດ",         cls: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-100 border-emerald-200 text-emerald-700" },
];

const FOLLOW_STATUSES = ["", ...FOLLOW_STEPS.map(s => s.value)];

const CALL_RESULTS = [
  { value: "ຈະຕໍ່ສັນຍາ",      icon: CheckCircle2,  cls: "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200", activeCls: "bg-emerald-500 text-white border-emerald-500" },
  { value: "ກຳລັງພິຈາລະນາ",   icon: HelpCircle,    cls: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",       activeCls: "bg-amber-500 text-white border-amber-500" },
  { value: "ຈະໂທກັບ",          icon: PhoneCall,     cls: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",           activeCls: "bg-blue-500 text-white border-blue-500" },
  { value: "ບໍ່ຮັບສາຍ",        icon: PhoneMissed,   cls: "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200",       activeCls: "bg-slate-500 text-white border-slate-500" },
  { value: "ບໍ່ສົນໃຈ",         icon: ThumbsDown,    cls: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",               activeCls: "bg-red-500 text-white border-red-500" },
];

const DURATION_OPTIONS = [
  { label: "1 ເດືອນ",  totalMonths: 1,  paid: 1,  bonus: 0 },
  { label: "3 ເດືອນ",  totalMonths: 4,  paid: 3,  bonus: 1, sub: "+1 ແຖມ" },
  { label: "6 ເດືອນ",  totalMonths: 8,  paid: 6,  bonus: 2, sub: "+2 ແຖມ" },
  { label: "12 ເດືອນ", totalMonths: 16, paid: 12, bonus: 4, sub: "+4 ແຖມ" },
];

function calcExpiryFromStart(startDateStr, totalMonths) {
  try {
    const start = parseISO(startDateStr);
    return subDays(addMonths(start, totalMonths), 1);
  } catch {
    return subDays(addMonths(new Date(), totalMonths), 1);
  }
}

function getDefaultStartDate(customer) {
  const today = new Date();
  if (!customer.expiryDate) return format(today, "yyyy-MM-dd");
  try {
    const exp = parseISO(customer.expiryDate);
    // If customer still active (not expired), default start = day after current expiry
    if (exp >= today) {
      const nextDay = new Date(exp);
      nextDay.setDate(nextDay.getDate() + 1);
      return format(nextDay, "yyyy-MM-dd");
    }
  } catch {}
  return format(today, "yyyy-MM-dd");
}

export function RenewModal({ customer, onClose, onRenew }) {
  const today = new Date();
  const isStillActive = customer.expiryDate
    ? parseISO(customer.expiryDate) >= today
    : false;

  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState(getDefaultStartDate(customer));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const newExpiry = selected
    ? calcExpiryFromStart(startDate, selected.totalMonths)
    : null;

  const startDateObj = startDate ? parseISO(startDate) : null;
  const daysFromToday = startDateObj ? differenceInDays(startDateObj, today) : 0;

  const handleConfirm = async () => {
    if (!selected || !startDate) return;
    setSaving(true);
    const newExpiryStr = format(calcExpiryFromStart(startDate, selected.totalMonths), "yyyy-MM-dd");
    await onRenew({
      startDate,
      expiryDate: newExpiryStr,
      status: "active",
      followUpStatus: "ສຳເລັດ",
      _paymentAmount: Number(amount) || 0,
      _paymentMethod: paymentMethod,
      _paidMonths:    selected.paid,
      _bonusMonths:   selected.bonus ?? 0,
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 2000);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <div className="font-extrabold text-foreground text-xl">ຕໍ່ສັນຍາສຳເລັດ!</div>
            <div className="text-sm text-muted-foreground mt-1">{customer.name}</div>
          </div>
          {newExpiry && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 inline-flex flex-col items-center gap-0.5">
              <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">ໝົດສັນຍາໃໝ່</span>
              <span className="text-emerald-700 font-extrabold text-lg">{format(newExpiry, "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(0,66%,36%)] to-[hsl(0,66%,52%)] flex items-center justify-center flex-shrink-0 shadow-sm">
              <RotateCcw size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-base leading-tight">ຕໍ່ສັນຍາ</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{customer.name} · <span className="font-mono text-[hsl(0,66%,42%)] font-bold">{customer.accountId}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* ── Current status info ── */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "ສະຖານະ",
                value: isStillActive ? "ຍັງໃຊ້ງານ" : "ໝົດອາຍຸ",
                cls: isStillActive ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200",
              },
              {
                label: "ໝົດວັນທີ",
                value: customer.expiryDate ? format(parseISO(customer.expiryDate), "dd/MM/yy") : "—",
                cls: "text-foreground bg-muted/50 border-border",
              },
              {
                label: "ຄວາມໄວ",
                value: customer.speed ?? "—",
                cls: "text-[hsl(0,66%,42%)] bg-red-50 border-red-100 font-mono",
              },
            ].map(item => (
              <div key={item.label} className={`rounded-xl border px-3 py-2.5 text-center ${item.cls}`}>
                <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">{item.label}</div>
                <div className="text-sm font-extrabold leading-none">{item.value}</div>
              </div>
            ))}
          </div>

          {/* ── Start Date Picker ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={13} className="text-[hsl(0,66%,42%)]" />
              <span className="text-xs font-bold text-foreground uppercase tracking-widest">ວັນທີເລີ່ມຕໍ່ສັນຍາ</span>
            </div>
            <DateInput
              isoMode
              value={startDate}
              onChange={setStartDate}
              min={format(today, "yyyy-MM-dd")}
              className="[&_input:first-child]:rounded-xl [&_input:first-child]:border-2 [&_input:first-child]:border-[hsl(0,66%,42%)] [&_input:first-child]:bg-red-50/50 [&_input:first-child]:px-4 [&_input:first-child]:py-3 [&_input:first-child]:font-bold [&_input:first-child]:focus:ring-[hsl(0,66%,42%)]/30"
            />
            {isStillActive && startDateObj && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {daysFromToday > 0 ? (
                  <span className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-semibold">
                    <Clock size={10} /> ເລີ່ມໃນອີກ {daysFromToday} ວັນ (ຕໍ່ຈາກວັນໝົດ)
                  </span>
                ) : daysFromToday === 0 ? (
                  <span className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold">
                    <CalendarDays size={10} /> ເລີ່ມມື້ນີ້
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Duration Options ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift size={13} className="text-amber-500" />
              <span className="text-xs font-bold text-foreground uppercase tracking-widest">ເລືອກໄລຍະເວລາ</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map(opt => {
                const isActive = selected?.totalMonths === opt.totalMonths;
                const previewExpiry = startDate
                  ? format(calcExpiryFromStart(startDate, opt.totalMonths), "dd/MM/yyyy")
                  : null;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setSelected(opt)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      isActive
                        ? "border-[hsl(0,66%,42%)] bg-gradient-to-br from-red-50 to-red-100/60 shadow-sm"
                        : "border-border hover:border-slate-300 bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-extrabold text-sm ${isActive ? "text-[hsl(0,66%,42%)]" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      {opt.bonus > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          <Gift size={7} /> +{opt.bonus}
                        </span>
                      )}
                    </div>
                    {opt.sub && (
                      <div className="text-[10px] text-amber-600 font-semibold mt-0.5">{opt.sub}</div>
                    )}
                    {isActive && previewExpiry && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                        <CalendarDays size={9} /> ໝົດ {previewExpiry}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Summary Timeline ── */}
          {selected && newExpiry && (
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">ສະຫຼຸບການຕໍ່ສັນຍາ</div>
              <div className="flex items-center gap-2">
                {/* Start */}
                <div className="flex-1 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">ເລີ່ມ</div>
                  <div className="bg-white border border-blue-200 rounded-lg px-2 py-1.5">
                    <div className="text-xs font-extrabold text-blue-700">{format(parseISO(startDate), "dd/MM/yyyy")}</div>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <div className="text-[9px] font-bold text-muted-foreground">{selected.paid}ດ+{selected.bonus}ແຖມ</div>
                  <div className="w-10 h-0.5 bg-gradient-to-r from-blue-400 to-emerald-400 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-emerald-400 border-y-2 border-y-transparent" />
                  </div>
                </div>
                {/* End */}
                <div className="flex-1 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">ໝົດ</div>
                  <div className="bg-white border border-emerald-300 rounded-lg px-2 py-1.5 shadow-sm">
                    <div className="text-xs font-extrabold text-emerald-700">{format(newExpiry, "dd/MM/yyyy")}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={12} />
                ໄລຍະທັງໝົດ {selected.totalMonths} ເດືອນ ({selected.paid} ຊຳລະ + {selected.bonus} ແຖມ)
              </div>
            </div>
          )}
        </div>

        {/* ── Payment Info ── */}
        <div className="border-t border-border px-6 py-4 space-y-3 bg-muted/20">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ຂໍ້ມູນການຊຳລະ (ທາງເລືອກ)</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ຈຳນວນເງິນ (ກີບ)</label>
              <input
                type="number"
                min="0"
                value={amount || ""}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] bg-background"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ວິທີຊຳລະ</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] bg-background"
              >
                <option value="cash">ເງິນສົດ</option>
                <option value="transfer">ໂອນເງິນ</option>
                <option value="other">ອື່ນໆ</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            ຍົກເລີກ
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || !startDate || saving}
            className="flex-1 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-bold hover:bg-[hsl(0,66%,35%)] transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            {saving ? "ກຳລັງບັນທຶກ..." : "ຢືນຢັນຕໍ່ສັນຍາ"}
          </button>
        </div>
      </div>
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

function getStepIndex(val) {
  return FOLLOW_STEPS.findIndex(s => s.value === val);
}

function ExpiryChip({ expiryDate }) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days > 0) {
    const cls = days <= 3 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200";
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}><Clock size={9} /> {days} ວັນ</span>;
  }
  if (days === 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-200 text-red-800 border border-red-300 animate-pulse">ໝົດມື້ນີ້!</span>;
  const months = Math.floor(Math.abs(days) / 30);
  const label = months >= 1 ? `ໝົດກຳໜົດ ${months} ເດືອນ` : `ໝົດກຳໜົດ ${Math.abs(days)} ມື້`;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200"><XCircle size={9} /> {label}</span>;
}

function ProgressStepper({ current, onChange }) {
  const idx = getStepIndex(current);
  return (
    <div className="w-full">
      {/* Circles + connector lines row */}
      <div className="flex items-center">
        {FOLLOW_STEPS.map((step, i) => {
          const done = idx >= i;
          return (
            <div key={step.value} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onChange(step.value)}
                title={step.label}
                className="group flex-shrink-0 mx-auto"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done
                    ? `${step.cls} border-transparent text-white shadow-sm`
                    : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-400"
                }`}>
                  {done ? (i < 3 ? <span className="text-[8px]">✓</span> : <span className="text-[8px]">★</span>) : i + 1}
                </div>
              </button>
              {i < FOLLOW_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors ${idx > i ? FOLLOW_STEPS[i].cls : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      {/* Labels row */}
      <div className="flex items-start mt-1">
        {FOLLOW_STEPS.map((step, i) => {
          const done = idx >= i;
          const active = idx === i;
          return (
            <button
              key={step.value}
              onClick={() => onChange(step.value)}
              className={`flex-1 min-w-0 text-[9px] font-semibold leading-tight text-center px-0.5 transition-colors ${
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-slate-300 hover:text-slate-400"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ລາຄາ/ວັນ ຕາມແພັກເກດ (ສຳລັບ CalcExpiryModal) ──────────────
const CALC_PACKAGES = [
  { value: 1,  label: "1 ເດືອນ",  rate: 16_833.33 },
  { value: 4,  label: "4 ເດືອນ",  rate: 5_500 },
  { value: 8,  label: "8 ເດືອນ",  rate: 5_500 },
  { value: 16, label: "16 ເດືອນ", rate: 5_500 },
];

function CalcExpiryModal({ customer, onClose, onApply }) {
  const [raw, setRaw]       = useState("");
  const [pkg, setPkg]       = useState(4);
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const balance  = parseFloat(String(raw).replace(/,/g, "")) || 0;
  const selected = CALC_PACKAGES.find(p => p.value === pkg);
  const days     = balance > 0 ? Math.floor(balance / selected.rate) : 0;
  const expiry   = days > 0 ? addDays(new Date(), days) : null;

  const urgencyDays = expiry ? differenceInDays(expiry, new Date()) : null;
  const urgencyCls  = urgencyDays == null ? ""
    : urgencyDays < 0  ? "text-red-600 bg-red-50 border-red-200"
    : urgencyDays <= 30 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200";

  function handleChange(e) {
    const v = e.target.value.replace(/,/g, "").replace(/[^\d]/g, "");
    setRaw(v ? Number(v).toLocaleString("en-US") : "");
  }

  async function apply() {
    if (!expiry) return;
    setSaving(true);
    await onApply(format(expiry, "yyyy-MM-dd"));
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">

        {/* header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3"
          style={{ background: "linear-gradient(135deg, hsl(0,72%,36%) 0%, hsl(0,60%,30%) 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={18} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-white text-[15px] leading-tight">ຄຳນວນວັນໝົດອາຍຸ</h3>
              <p className="text-white/60 text-[11px] mt-0.5 font-mono">{customer.accountId} · {customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">ອັບເດດສຳເລັດ!</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  ວັນໝົດອາຍຸໃໝ່: <span className="font-bold text-foreground">{expiry ? format(expiry, "dd/MM/yyyy") : "—"}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Current expiry info */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">ໝົດອາຍຸປັດຈຸບັນ</span>
                <span className="text-xs font-bold text-foreground">
                  {customer.expiryDate ? format(parseISO(customer.expiryDate), "dd/MM/yyyy") : "—"}
                </span>
              </div>

              {/* Balance input */}
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Wallet size={15} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">ເງິນທີ່ເຫຼືອ (ກີບ)</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={raw}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full text-xl font-bold text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                    />
                  </div>
                  {raw && (
                    <button onClick={() => setRaw("")} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
                  )}
                </div>
              </div>

              {/* Package selector */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">ເລືອກແພັກເກດ</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {CALC_PACKAGES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPkg(p.value)}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 transition-all text-center ${
                        pkg === p.value
                          ? "border-[hsl(0,66%,42%)] bg-red-50 shadow-sm"
                          : "border-border bg-background hover:border-muted-foreground/40"
                      }`}
                    >
                      <span className={`text-[12px] font-bold leading-tight ${pkg === p.value ? "text-[hsl(0,66%,42%)]" : "text-foreground"}`}>
                        {p.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        {p.rate.toLocaleString("en-US", { maximumFractionDigits: 0 })}/ວັນ
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result */}
              {expiry ? (
                <div
                  className="rounded-xl px-4 py-3.5 space-y-2"
                  style={{ background: "linear-gradient(135deg, hsl(0,72%,36%) 0%, hsl(0,60%,30%) 100%)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">ວັນໝົດອາຍຸໃໝ່</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urgencyCls}`}>
                      ເຫຼືອ {urgencyDays} ວັນ
                    </span>
                  </div>
                  <div className="text-white font-bold text-3xl">{format(expiry, "dd/MM/yyyy")}</div>
                  <div className="text-white/50 text-[11px]">
                    TODAY + {days.toLocaleString("en-US")} ວັນ · {selected.label} · {balance.toLocaleString("en-US")} ກີບ
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border flex items-center justify-center py-5 text-muted-foreground text-sm gap-2">
                  <CalendarClock size={16} strokeWidth={1.5} /> ໃສ່ຈຳນວນເງິນເພື່ອຄຳນວນ
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={apply}
                disabled={!expiry || saving}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={expiry ? { background: "linear-gradient(135deg, hsl(0,72%,36%), hsl(0,60%,30%))", color: "white" } : {}}
              >
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> ກຳລັງອັບເດດ...</>
                  : <><CheckCircle2 size={15} /> ອັບເດດວັນໝົດອາຍຸ</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackingCard({ customer, onUpdate, currentUser, packages, isHighlighted, autoOpenRenew }) {
  const myName = currentUser?.displayName ?? currentUser?.username ?? "ບໍ່ຮູ້ຈັກ";
  const [fs, setFs] = useState(customer.followUpStatus ?? "");
  const [fp] = useState(myName);
  const [remarks, setRemarks] = useState(customer.remarks ?? "");
  const [callResult, setCallResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCalcExpiry, setShowCalcExpiry] = useState(false);
  const [editCustomer, setEditCustomer] = useState(customer);

  // ─── Auto-open RenewModal ຖ້າຖືກສົ່ງມາຈາກ Dashboard ──────────
  useEffect(() => {
    if (autoOpenRenew) setShowRenew(true);
  }, [autoOpenRenew]);

  const dirty =
    fs !== (customer.followUpStatus ?? "") ||
    remarks !== (customer.remarks ?? "");

  const cardIdRef = useRef(`card-${customer.id}`);
  useEffect(() => {
    if (!window.__ltcDirtySet) window.__ltcDirtySet = new Set();
    const isDirty = dirty || !!callResult;
    if (isDirty) window.__ltcDirtySet.add(cardIdRef.current);
    else window.__ltcDirtySet.delete(cardIdRef.current);
    window.__ltcDirty = window.__ltcDirtySet.size > 0;

    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, callResult]);

  useEffect(() => {
    return () => {
      if (!window.__ltcDirtySet) return;
      window.__ltcDirtySet.delete(cardIdRef.current);
      window.__ltcDirty = window.__ltcDirtySet.size > 0;
    };
  }, []);

  const buildRemarks = () => {
    if (!callResult) return remarks;
    const tag = `📞 ຜົນການໂທ: ${callResult}`;
    const body = remarks.trim();
    return body ? `${tag}\n${body}` : tag;
  };

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate(customer.id, { followUpStatus: fs, followUpPerson: fp, remarks: buildRemarks() });
      setSaved(true);
      setCallResult("");
      setTimeout(() => setSaved(false), 2500);
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  const createPayment = useCreatePayment();
  const handleRenew = async (patch) => {
    const { _paymentAmount, _paymentMethod, _paidMonths, _bonusMonths, ...customerPatch } = patch;
    await onUpdate(customer.id, customerPatch);
    if ((_paymentAmount ?? 0) > 0) {
      createPayment.mutate({
        customerId:        customer.id,
        customerName:      customer.name,
        customerAccountId: customer.accountId,
        amount:            _paymentAmount,
        paidMonths:        _paidMonths ?? 1,
        bonusMonths:       _bonusMonths ?? 0,
        paymentMethod:     _paymentMethod ?? "cash",
        startDate:         customerPatch.startDate,
        expiryDate:        customerPatch.expiryDate,
        recordedBy:        currentUser?.username,
      });
    }
    setFs("ສຳເລັດ");
  };

  const handleEditSave = async (form) => {
    await onUpdate(customer.id, form);
    setEditCustomer(prev => ({ ...prev, ...form }));
    setFs(form.followUpStatus ?? fs);
    setShowEdit(false);
  };

  const handleCalcApply = async (newExpiryDate) => {
    await onUpdate(customer.id, { expiryDate: newExpiryDate, status: "active" });
  };

  const stepInfo = FOLLOW_STEPS.find(s => s.value === fs);
  const initial = customer.name?.[0]?.toUpperCase() ?? "?";
  const canRenew = callResult === "ຈະຕໍ່ສັນຍາ";

  return (
    <>
      {showRenew && (
        <RenewModal customer={customer} onClose={() => setShowRenew(false)} onRenew={handleRenew} />
      )}
      {showEdit && (
        <FullEditModal
          customer={editCustomer}
          packages={packages}
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
        />
      )}
      {showCalcExpiry && (
        <CalcExpiryModal
          customer={customer}
          onClose={() => setShowCalcExpiry(false)}
          onApply={handleCalcApply}
        />
      )}
    <div
      id={`card-${customer.id}`}
      className={`border-b border-border last:border-0 transition-all duration-700 ${
        saved ? "bg-emerald-50/30" : isHighlighted ? "bg-red-50/60" : "hover:bg-muted/20"
      } ${isHighlighted ? "ring-2 ring-red-500 ring-inset shadow-lg shadow-red-100" : ""}`}
    >
      {isHighlighted && (
        <div className="mx-4 mt-3 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700">ກຳລັງສະແດງ: {customer.name}</span>
        </div>
      )}
      <div className="px-4 pt-4 pb-3 space-y-3">

        {/* ── HEADER: Avatar + Name + Account ID/Expiry ── */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm relative">
            {initial}
            {customer.vip && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow">
                <Star size={8} className="text-white fill-white" />
              </span>
            )}
          </div>

          {/* Name + status | Account + expiry */}
          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
            {/* Left */}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <div className="font-extrabold text-foreground text-base leading-snug truncate">{customer.name}</div>
                <CopyBtn text={customer.name} />
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {stepInfo && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stepInfo.light}`}>
                    {stepInfo.label}
                  </span>
                )}
                {customer.updatedAt && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock size={8} />{formatDistanceToNow(new Date(customer.updatedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            {/* Right: Account ID + expiry stacked */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1">
                <CopyBtn text={customer.accountId} />
                <div className="bg-[hsl(0,66%,42%)] text-white font-mono font-black text-sm tracking-widest px-3 py-1.5 rounded-lg shadow-sm">
                  {customer.accountId}
                </div>
              </div>
              {customer.expiryDate && <ExpiryChip expiryDate={customer.expiryDate} />}
            </div>
          </div>
        </div>

        {/* ── INFO CHIPS ── */}
        <div className="flex flex-wrap gap-1.5">
          {(customer.phone ?? "").split("/").filter(Boolean).length > 0
            ? (customer.phone ?? "").split("/").filter(Boolean).map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="font-mono font-semibold text-xs text-slate-800 tracking-tight">{p.trim()}</span>
                  <CopyBtn text={p.trim()} />
                </div>
              ))
            : (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="font-mono font-semibold text-xs text-slate-800 tracking-tight">—</span>
                </div>
              )}
          {(() => {
            const firstPhone = (customer.phone ?? "").split("/").filter(Boolean)[0]?.trim();
            if (!firstPhone) return null;
            const waUrl = `https://wa.me/${firstPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`ສະ​ບາຍ​ດີ ${customer.name ?? ""}, ສັນ​ຍາ​ Internet ຂອງ​ທ່ານ...`)}`;
            return (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
                title="ສົ່ງ WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="#25D366" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="text-[10px] font-bold text-emerald-700">WhatsApp</span>
              </a>
            );
          })()}
          {customer.address && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <MapPin size={11} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 max-w-[150px] truncate">{customer.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            <Wifi size={11} className="text-[hsl(0,66%,42%)] flex-shrink-0" />
            <span className="text-xs font-black text-[hsl(0,66%,42%)]">{customer.speed ?? "—"}</span>
          </div>
          {customer.expiryDate && (
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${
              differenceInDays(parseISO(customer.expiryDate), new Date()) < 0
                ? "bg-red-50 border-red-200 text-red-700"
                : differenceInDays(parseISO(customer.expiryDate), new Date()) <= 30
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <Calendar size={11} className={
                differenceInDays(parseISO(customer.expiryDate), new Date()) < 0
                  ? "text-red-400"
                  : differenceInDays(parseISO(customer.expiryDate), new Date()) <= 30
                  ? "text-amber-400"
                  : "text-slate-400"
              } />
              <span className="text-xs font-bold">{format(parseISO(customer.expiryDate), "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="border-t border-dashed border-border/60" />

        {/* ── PROGRESS STEPPER ── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">ຄວາມຄືບໜ້າ</span>
          <ProgressStepper current={fs} onChange={v => setFs(v)} />
        </div>

        {/* ── CALL RESULT ── */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <PhoneCall size={9} /> ລູກຄ້າບອກວ່າ
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CALL_RESULTS.map(cr => {
              const Icon = cr.icon;
              const active = callResult === cr.value;
              return (
                <button
                  key={cr.value}
                  onClick={() => setCallResult(active ? "" : cr.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${active ? cr.activeCls : cr.cls}`}
                >
                  <Icon size={10} />
                  {cr.value}
                </button>
              );
            })}
          </div>
          {canRenew && (
            <button
              onClick={() => setShowRenew(true)}
              className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <RotateCcw size={13} /> ຕໍ່ສັນຍາໄດ້ເລີຍ →
            </button>
          )}
        </div>

        {/* ── ASSIGNED PERSON ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[hsl(0,66%,42%)] flex items-center justify-center text-white text-[9px] font-bold">
              {myName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-xs font-semibold text-foreground">{myName}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">ຜູ້ຕິດຕາມ</span>
          </div>
          {customer.followUpPerson && customer.followUpPerson !== myName && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <UserCheck size={9} /> ຕິດຕາມໂດຍ: <span className="font-semibold">{customer.followUpPerson}</span>
            </span>
          )}
        </div>

        {/* ── REMARKS ── */}
        <div className="space-y-1.5">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
          >
            <MessageSquare size={10} />
            ໝາຍເຫດ / ບັນທຶກ
            {customer.remarks && !expanded && (
              <span className="text-[10px] text-blue-500 normal-case font-normal tracking-normal">
                ({customer.remarks.slice(0, 35)}{customer.remarks.length > 35 ? "…" : ""})
              </span>
            )}
          </button>
          {expanded && (
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder="ບັນທຶກລາຍລະອຽດການຕິດຕາມ..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-[hsl(0,66%,42%)] resize-none placeholder:text-muted-foreground/50"
            />
          )}
        </div>

            {/* Row 7: save button + edit button */}
            <div className="flex items-center gap-2 flex-wrap">
              {(dirty || callResult || saved) && (
                <>
                  {(dirty || callResult) && (
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(0,66%,42%)] text-white text-[11px] font-bold hover:bg-[hsl(0,66%,35%)] transition-colors disabled:opacity-50"
                    >
                      {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                      {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
                    </button>
                  )}
                  {saved && !dirty && (
                    <span className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
                      <CheckCircle2 size={13} /> ບັນທຶກສຳເລັດ
                    </span>
                  )}
                </>
              )}
              <button
                onClick={() => setShowCalcExpiry(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 border border-violet-200 transition-colors"
              >
                <CalendarClock size={11} /> ຄຳນວນໝົດອາຍຸ
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-bold hover:bg-blue-100 border border-blue-200 transition-colors ml-auto"
              >
                <Edit2 size={11} /> ແກ້ໄຂຂໍ້ມູນ
              </button>
            </div>
      </div>
    </div>
    </>
  );
}

function StatPill({ label, value, color, bg }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg}`}>
      <span className={`text-lg font-black ${color}`}>{value}</span>
      <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
    </div>
  );
}

// ─── TrackingMonthlyReportModal ────────────────────────────────
const LAO_MONTHS = [
  "ມັງກອນ","ກຸມພາ","ມີນາ","ເມສາ","ພຶດສະພາ","ມິຖຸນາ",
  "ກໍລະກົດ","ສິງຫາ","ກັນຍາ","ຕຸລາ","ພະຈິກ","ທັນວາ",
];

const RPT_STATUS_LABEL = { active: "ໃຊ້ງານ", inactive: "ບໍ່ໃຊ້ງານ", suspended: "ຖືກລະງັບ", expired: "ໝົດອາຍຸ" };
const RPT_STATUS_CLS   = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:  "bg-muted text-muted-foreground border-border",
  suspended: "bg-amber-100 text-amber-700 border-amber-200",
  expired:   "bg-red-100 text-red-700 border-red-200",
};
const RPT_FOLLOW_CLS = {
  "ສຳເລັດ":       "bg-emerald-100 text-emerald-700",
  "ກຳລັງຕິດຕາມ": "bg-amber-100 text-amber-700",
  "ຕິດຕາມແລ້ວ":   "bg-blue-100 text-blue-700",
  "ຕ້ອງຕິດຕາມ":   "bg-red-100 text-red-700",
};
const RPT_COLS = ["#","ຊື່ລູກຄ້າ","ລະຫັດ","ເບີໂທ","ຄວາມໄວ","ວັນໝົດ","ສະຖານະ","ສະຖານະຕິດຕາມ","ຜູ້ຕິດຕາມ","ໝາຍເຫດ"];

function ReportRow({ c, idx, rowCls }) {
  return (
    <tr className={`${rowCls} border-t border-border hover:opacity-90 transition-opacity`}>
      <td className="px-3 py-2 text-center font-bold text-muted-foreground w-8 shrink-0">{idx}</td>
      <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap max-w-[140px] truncate">{c.name}</td>
      <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">{c.accountId ?? "—"}</td>
      <td className="px-3 py-2 whitespace-nowrap">{c.phone}</td>
      <td className="px-3 py-2 whitespace-nowrap font-medium">{c.speed ?? "—"}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        {c.expiryDate ? format(parseISO(c.expiryDate), "dd/MM/yyyy") : "—"}
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${RPT_STATUS_CLS[c.status] ?? "bg-muted text-muted-foreground border-border"}`}>
          {RPT_STATUS_LABEL[c.status] ?? c.status}
        </span>
      </td>
      <td className="px-3 py-2">
        {c.followUpStatus
          ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${RPT_FOLLOW_CLS[c.followUpStatus] ?? "bg-muted text-muted-foreground"}`}>{c.followUpStatus}</span>
          : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-[11px]">{c.followUpPerson ?? "—"}</td>
      <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate text-[11px]">{c.remarks ?? ""}</td>
    </tr>
  );
}

export function TrackingMonthlyReportModal({ onClose, allCustomers, packages, currentUser }) {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [reportData, setReportData] = useState(null);
  const [exporting,  setExporting]  = useState(false);
  const [exportError, setExportError] = useState("");

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  function generateReport() {
    const start = new Date(selYear, selMonth - 1, 1);
    const end   = new Date(selYear, selMonth, 0, 23, 59, 59);
    const data  = allCustomers.filter(c => {
      if (!c.expiryDate) return false;
      const exp = parseISO(c.expiryDate);
      return exp >= start && exp <= end;
    });
    setReportData(data);
  }

  const success  = (reportData ?? []).filter(c => c.followUpStatus === "ສຳເລັດ");
  const inProg   = (reportData ?? []).filter(c => c.followUpStatus === "ກຳລັງຕິດຕາມ" || c.followUpStatus === "ຕິດຕາມແລ້ວ");
  const pending  = (reportData ?? []).filter(c => !c.followUpStatus || c.followUpStatus === "ຕ້ອງຕິດຕາມ");
  const total    = (reportData ?? []).length;

  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
  const monthLabel  = LAO_MONTHS[selMonth - 1];
  const reportTitle = `ລາຍງານຕິດຕາມລູກຄ້າ ປະຈຳເດືອນ ${monthLabel} ${selYear}`;
  const dateStr     = format(now, "dd/MM/yyyy HH:mm");
  const userName    = currentUser?.name ?? currentUser?.username ?? "—";

  // ─── Excel Export ────────────────────────────────────────────
  async function handleExport() {
    if (!reportData || reportData.length === 0) return;
    setExporting(true);
    setExportError("");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "LTC FTTH Tracker";
      wb.created = now;

      const COL_WIDTHS = [5, 24, 14, 14, 12, 13, 14, 18, 18, 28];
      const N = 10;

      function buildHeader(ws, sheetTitle, headerArgb) {
        ws.columns = COL_WIDTHS.map(w => ({ width: w }));
        // Row 1: company
        ws.mergeCells(1,1,1,N);
        const r1 = ws.getCell(1,1);
        r1.value = "ລາວ ໂທລະຄົມ (Lao Telecom)";
        r1.font  = { name:"Calibri", bold:true, size:16, color:{argb:"FFFFFFFF"} };
        r1.fill  = { type:"pattern", pattern:"solid", fgColor:{argb:"FF7B1A1A"} };
        r1.alignment = { horizontal:"center", vertical:"middle" };
        ws.getRow(1).height = 30;
        // Row 2: report title
        ws.mergeCells(2,1,2,N);
        const r2 = ws.getCell(2,1);
        r2.value = sheetTitle;
        r2.font  = { name:"Calibri", bold:true, size:13, color:{argb:"FFFFFFFF"} };
        r2.fill  = { type:"pattern", pattern:"solid", fgColor:{argb:"FFC0392B"} };
        r2.alignment = { horizontal:"center", vertical:"middle" };
        ws.getRow(2).height = 24;
        // Row 3: date + user
        ws.mergeCells(3,1,3,N);
        const r3 = ws.getCell(3,1);
        r3.value = `ວັນທີອອກລາຍງານ: ${dateStr}  |  ຈັດທຳໂດຍ: ${userName}`;
        r3.font  = { name:"Calibri", size:10, color:{argb:"FF888888"}, italic:true };
        r3.alignment = { horizontal:"center", vertical:"middle" };
        ws.getRow(3).height = 18;
        // Row 4: spacer
        ws.getRow(4).height = 6;
        return 5;
      }

      function buildTableHeader(ws, row, argb) {
        RPT_COLS.forEach((h, i) => {
          const cell = ws.getCell(row, i+1);
          cell.value = h;
          cell.font  = { name:"Calibri", bold:true, size:11, color:{argb:"FFFFFFFF"} };
          cell.fill  = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+argb} };
          cell.alignment = { horizontal:"center", vertical:"middle" };
          cell.border = {
            top:    { style:"thin",   color:{argb:"FF"+argb} },
            bottom: { style:"medium", color:{argb:"FF"+argb} },
            left:   { style:"thin",   color:{argb:"FFE0E0E0"} },
            right:  { style:"thin",   color:{argb:"FFE0E0E0"} },
          };
        });
        ws.getRow(row).height = 22;
        ws.views = [{ state:"frozen", ySplit:row }];
        return row + 1;
      }

      function buildRows(ws, dataList, startRow, bgArgb) {
        dataList.forEach((c, i) => {
          const r = startRow + i;
          ws.getRow(r).height = 18;
          const vals = [
            i+1,
            c.name ?? "",
            c.accountId ?? "",
            c.phone ?? "",
            c.speed ?? "",
            c.expiryDate ? format(parseISO(c.expiryDate), "dd/MM/yyyy") : "",
            RPT_STATUS_LABEL[c.status] ?? c.status ?? "",
            c.followUpStatus ?? "",
            c.followUpPerson ?? "",
            c.remarks ?? "",
          ];
          vals.forEach((v, ci) => {
            const cell = ws.getCell(r, ci+1);
            cell.value = v;
            cell.font  = { name:"Calibri", size:10 };
            cell.fill  = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+bgArgb} };
            cell.alignment = { vertical:"middle", wrapText:false };
            cell.border = {
              top:    { style:"hair", color:{argb:"FFE0E0E0"} },
              bottom: { style:"hair", color:{argb:"FFE0E0E0"} },
              left:   { style:"hair", color:{argb:"FFE0E0E0"} },
              right:  { style:"hair", color:{argb:"FFE0E0E0"} },
            };
            if (ci === 0) cell.alignment = { horizontal:"center", vertical:"middle" };
            if (ci === 1) cell.font = { name:"Calibri", size:10, bold:true };
          });
        });
      }

      // ── Sheet 1: Summary ──────────────────────────────────────
      const ws1 = wb.addWorksheet("ສະຫຼຸບລວມ", { properties:{ tabColor:{argb:"FF7B1A1A"} } });
      let rn = buildHeader(ws1, reportTitle, "7B1A1A");

      // KPI block (4 groups × 2 cols)
      const kpiItems = [
        { label:"ລວມທັງໝົດ", value:total,          pct:"100%",       bg:"F5F5F5", color:"333333" },
        { label:"ສຳເລັດ",    value:success.length,  pct:`${pct(success.length)}%`, bg:"E8F5E9", color:"2E7D32" },
        { label:"ກຳລັງຕິດຕາມ", value:inProg.length, pct:`${pct(inProg.length)}%`,  bg:"FFFDE7", color:"F57F17" },
        { label:"ຍັງບໍ່ຕິດຕາມ", value:pending.length, pct:`${pct(pending.length)}%`, bg:"FFEBEE", color:"C62828" },
      ];
      ws1.getRow(rn).height = 8; rn++;
      const kpiLblRow = rn; const kpiValRow = rn+1; const kpiPctRow = rn+2;
      ws1.getRow(kpiLblRow).height = 20;
      ws1.getRow(kpiValRow).height = 32;
      ws1.getRow(kpiPctRow).height = 18;
      kpiItems.forEach((k, i) => {
        const sc = i*2+1, ec = i*2+2;
        [[kpiLblRow, k.label, 11, true, {top:{style:"thin",color:{argb:"FFCCCCCC"}},left:{style:"thin",color:{argb:"FFCCCCCC"}},right:{style:"thin",color:{argb:"FFCCCCCC"}}}],
         [kpiValRow, k.value, 20, true, {left:{style:"thin",color:{argb:"FFCCCCCC"}},right:{style:"thin",color:{argb:"FFCCCCCC"}}}],
         [kpiPctRow, k.pct,   11, false, {bottom:{style:"thin",color:{argb:"FFCCCCCC"}},left:{style:"thin",color:{argb:"FFCCCCCC"}},right:{style:"thin",color:{argb:"FFCCCCCC"}}}],
        ].forEach(([row, val, sz, bold, border]) => {
          ws1.mergeCells(row, sc, row, ec);
          const cell = ws1.getCell(row, sc);
          cell.value = val;
          cell.font  = { name:"Calibri", size:sz, bold, color:{argb:"FF"+k.color} };
          cell.fill  = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+k.bg} };
          cell.alignment = { horizontal:"center", vertical:"middle" };
          cell.border = border;
        });
      });
      rn = kpiPctRow + 1;
      ws1.getRow(rn).height = 10; rn++;

      const tblStart1 = rn;
      const dataStart1 = buildTableHeader(ws1, tblStart1, "7B1A1A");

      // Add grouped rows in Sheet 1
      const BGS = "E8F5E9", BGP = "FFFDE7", BGR = "FFEBEE";
      let curRow = dataStart1;
      if (success.length > 0) { buildRows(ws1, success, curRow, BGS); curRow += success.length; }
      if (inProg.length  > 0) { buildRows(ws1, inProg,  curRow, BGP); curRow += inProg.length; }
      if (pending.length > 0) { buildRows(ws1, pending, curRow, BGR); curRow += pending.length; }

      // ── Sheet 2: ສຳເລັດ ──────────────────────────────────────
      const ws2 = wb.addWorksheet("ສຳເລັດແລ້ວ", { properties:{ tabColor:{argb:"FF1B5E20"} } });
      const ds2 = buildTableHeader(ws2, buildHeader(ws2, `${reportTitle} — ສຳເລັດ`, "1B5E20"), "1B5E20");
      buildRows(ws2, success, ds2, BGS);

      // ── Sheet 3: ກຳລັງຕິດຕາມ ─────────────────────────────────
      const ws3 = wb.addWorksheet("ກຳລັງຕິດຕາມ", { properties:{ tabColor:{argb:"FFE65100"} } });
      const ds3 = buildTableHeader(ws3, buildHeader(ws3, `${reportTitle} — ກຳລັງຕິດຕາມ`, "E65100"), "E65100");
      buildRows(ws3, inProg, ds3, BGP);

      // ── Sheet 4: ຍັງບໍ່ຕິດຕາມ ────────────────────────────────
      const ws4 = wb.addWorksheet("ຍັງບໍ່ຕິດຕາມ", { properties:{ tabColor:{argb:"FFB71C1C"} } });
      const ds4 = buildTableHeader(ws4, buildHeader(ws4, `${reportTitle} — ຍັງບໍ່ຕິດຕາມ`, "B71C1C"), "B71C1C");
      buildRows(ws4, pending, ds4, BGR);

      const buf  = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `tracking_report_${String(selMonth).padStart(2,"0")}_${selYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError("ເກີດຂໍ້ຜິດພາດ: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0 rounded-t-2xl"
          style={{ background:"linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,42%) 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">ລາຍງານປະຈຳເດືອນ</h3>
              <p className="text-white/60 text-xs mt-0.5">ສະຫຼຸບການຕິດຕາມລູກຄ້າ ແຍກຕາມເດືອນ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Month / Year selectors ─── */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ເດືອນ</label>
              <select
                value={selMonth}
                onChange={e => { setSelMonth(Number(e.target.value)); setReportData(null); }}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-[hsl(0,66%,42%)]"
              >
                {LAO_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ປີ</label>
              <select
                value={selYear}
                onChange={e => { setSelYear(Number(e.target.value)); setReportData(null); }}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-[hsl(0,66%,42%)]"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold shadow-sm transition-colors hover:opacity-90"
              style={{ background:"hsl(0,66%,42%)" }}
            >
              <Search size={14} /> ສ້າງລາຍງານ
            </button>
          </div>

          {/* ── KPI + Table (shown after generation) ─────────────── */}
          {reportData !== null && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:"ຕິດຕາມທັງໝົດ", value:total,          sub:null,                  color:"text-foreground",    bg:"bg-muted",           border:"border-border" },
                  { label:"ສຳເລັດ",        value:success.length,  sub:`${pct(success.length)}%`,  color:"text-emerald-700", bg:"bg-emerald-50",      border:"border-emerald-200" },
                  { label:"ກຳລັງຕິດຕາມ",  value:inProg.length,   sub:`${pct(inProg.length)}%`,   color:"text-amber-700",   bg:"bg-amber-50",        border:"border-amber-200" },
                  { label:"ຍັງບໍ່ຕິດຕາມ", value:pending.length,  sub:`${pct(pending.length)}%`,  color:"text-red-700",     bg:"bg-red-50",          border:"border-red-200" },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4 text-center`}>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70 ${k.color}`}>{k.label}</div>
                    <div className={`text-3xl font-extrabold leading-none ${k.color}`}>{k.value}</div>
                    {k.sub && <div className={`text-xs font-semibold mt-1 ${k.color}`}>{k.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Table */}
              {reportData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                  <CheckCircle2 size={32} className="text-muted-foreground/30" />
                  <p className="text-sm font-medium">ບໍ່ພົບຂໍ້ມູນໃນເດືອນ {monthLabel} {selYear}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-white" style={{ background:"hsl(0,66%,34%)" }}>
                          {RPT_COLS.map(col => (
                            <th key={col} className="px-3 py-2.5 text-left font-bold whitespace-nowrap first:text-center">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {success.length > 0 && (
                          <>
                            <tr className="bg-emerald-100">
                              <td colSpan={10} className="px-3 py-1.5 text-[11px] font-extrabold text-emerald-800 uppercase tracking-widest">
                                🟢 ສຳເລັດແລ້ວ (ຕໍ່ອາຍຸ / ຊຳລະແລ້ວ) — {success.length} ລາຍການ
                              </td>
                            </tr>
                            {success.map((c, i) => <ReportRow key={c.id} c={c} idx={i+1} rowCls="bg-emerald-50" />)}
                          </>
                        )}
                        {inProg.length > 0 && (
                          <>
                            <tr className="bg-amber-100">
                              <td colSpan={10} className="px-3 py-1.5 text-[11px] font-extrabold text-amber-800 uppercase tracking-widest">
                                🟡 ກຳລັງຕິດຕາມ / ກຳລັງພິຈາລະນາ — {inProg.length} ລາຍການ
                              </td>
                            </tr>
                            {inProg.map((c, i) => <ReportRow key={c.id} c={c} idx={i+1} rowCls="bg-amber-50" />)}
                          </>
                        )}
                        {pending.length > 0 && (
                          <>
                            <tr className="bg-red-100">
                              <td colSpan={10} className="px-3 py-1.5 text-[11px] font-extrabold text-red-800 uppercase tracking-widest">
                                🔴 ຍັງບໍ່ຕິດຕາມ / ບໍ່ສົນໃຈ — {pending.length} ລາຍການ
                              </td>
                            </tr>
                            {pending.map((c, i) => <ReportRow key={c.id} c={c} idx={i+1} rowCls="bg-red-50" />)}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0 bg-muted/20 rounded-b-2xl">
          <span className="text-xs text-muted-foreground flex-1">
            {exportError
              ? <span className="text-red-600 font-medium">{exportError}</span>
              : reportData !== null
                ? `${total} ລາຍການ · ${monthLabel} ${selYear}`
                : "ກະລຸນາເລືອກເດືອນ / ປີ ແລ້ວກົດ ສ້າງລາຍງານ"}
          </span>
          <div className="flex items-center gap-2">
            {reportData !== null && reportData.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-sm"
                style={{ background:"hsl(142,56%,40%)" }}
              >
                {exporting
                  ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>
                  : <><Download size={13} /> ນຳອອກ Excel ມືອາຊີບ</>}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              ປິດ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TrackingExportModal ───────────────────────────────────────
const EXPORT_COLUMNS = [
  { key: "name",           label: "ຊື່ລູກຄ້າ",      field: c => c.name ?? "" },
  { key: "accountId",      label: "ລະຫັດລູກຄ້າ",    field: c => c.accountId ?? "" },
  { key: "phone",          label: "ເບີໂທ",           field: c => c.phone ?? "" },
  { key: "address",        label: "ທີ່ຢູ່",           field: c => [c.address, c.city].filter(Boolean).join(", ") },
  { key: "speed",          label: "ຄວາມໄວ",          field: c => c.speed ?? "" },
  { key: "packageId",      label: "Package",          field: (c, pkgs) => pkgs.find(p => p.id === c.packageId)?.name ?? "" },
  { key: "expiryDate",     label: "ວັນໝົດອາຍຸ",      field: c => c.expiryDate ? format(parseISO(c.expiryDate), "dd/MM/yyyy") : "" },
  { key: "status",         label: "ສະຖານະລູກຄ້າ",   field: c => ({ active: "ໃຊ້ງານ", inactive: "ບໍ່ໃຊ້ງານ", suspended: "ຖືກລະງັບ", expired: "ໝົດອາຍຸ" })[c.status] ?? c.status ?? "" },
  { key: "followUpStatus", label: "ສະຖານະຕິດຕາມ",   field: c => c.followUpStatus ?? "" },
  { key: "followUpPerson", label: "ຜູ້ຕິດຕາມ",       field: c => c.followUpPerson ?? "" },
  { key: "remarks",        label: "ໝາຍເຫດ",           field: c => c.remarks ?? "" },
  { key: "vip",            label: "VIP",              field: c => c.vip ? "VIP" : "" },
];

const EXPORT_PERIODS = [
  { key: "all",       label: "ທັງໝົດ" },
  { key: "expiring",  label: "ໃກ້ໝົດ ≤ 1 ເດືອນ" },
  { key: "expired_1", label: "ໝົດ ≤ 6 ເດືອນ" },
  { key: "expired_2", label: "ໝົດ 6–12 ເດືອນ" },
  { key: "expired_3", label: "ໝົດ 12+ ເດືອນ" },
];

const EXPORT_FOLLOW = [
  { key: "",             label: "ທັງໝົດ" },
  { key: "ຕ້ອງຕິດຕາມ",   label: "ຕ້ອງຕິດຕາມ" },
  { key: "ກຳລັງຕິດຕາມ", label: "ກຳລັງຕິດຕາມ" },
  { key: "ຕິດຕາມແລ້ວ",   label: "ຕິດຕາມແລ້ວ" },
  { key: "ສຳເລັດ",       label: "ສຳເລັດ" },
];

function filterByPeriodKey(list, periodKey) {
  const now = new Date();
  if (periodKey === "all") return list;
  return list.filter(c => {
    if (!c.expiryDate) return false;
    const d = differenceInDays(parseISO(c.expiryDate), now);
    const daysPast = differenceInDays(now, parseISO(c.expiryDate));
    if (periodKey === "expiring")  return c.status === "active" && d >= -1 && d <= 30;
    if (periodKey === "expired_1") return daysPast > 0 && Math.floor(daysPast / 30) < 6;
    if (periodKey === "expired_2") { const m = Math.floor(daysPast / 30); return daysPast > 0 && m >= 6 && m < 12; }
    if (periodKey === "expired_3") return daysPast > 0 && Math.floor(daysPast / 30) >= 12;
    return true;
  });
}

export function TrackingExportModal({ onClose, filtered, packages }) {
  const [selectedCols, setSelectedCols] = useState(new Set(EXPORT_COLUMNS.map(c => c.key)));
  const [period, setPeriod] = useState("all");
  const [followSt, setFollowSt] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const toggleCol = key => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getExportData = () => {
    let data = filterByPeriodKey(filtered, period);
    if (followSt !== "") data = data.filter(c => c.followUpStatus === followSt);
    return data;
  };

  const handleExport = async () => {
    if (selectedCols.size === 0) { setError("ກະລຸນາເລືອກຢ່າງໜ້ອຍ 1 ຖັນ"); return; }
    setError("");
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "LTC FTTH Tracker";
      const ws = wb.addWorksheet("Tracking");

      const cols = EXPORT_COLUMNS.filter(c => selectedCols.has(c.key));
      const data = getExportData();

      ws.columns = cols.map(c => ({ header: c.label, width: Math.max(18, c.label.length + 6) }));

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B1A1A" } };
        cell.font   = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top:    { style: "thin", color: { argb: "FF7B1A1A" } },
          bottom: { style: "medium", color: { argb: "FF7B1A1A" } },
          left:   { style: "thin", color: { argb: "FFCCCCCC" } },
          right:  { style: "thin", color: { argb: "FFCCCCCC" } },
        };
      });
      headerRow.height = 24;

      data.forEach((c, idx) => {
        const row = ws.addRow(cols.map(col => col.field(c, packages)));
        const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFFFF5F5";
        row.eachCell(cell => {
          cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.alignment = { vertical: "middle" };
          cell.border    = { bottom: { style: "hair", color: { argb: "FFEEEEEE" } } };
        });
        row.height = 18;
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tracking_export_${format(new Date(), "yyyyMMdd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      setError("ເກີດຂໍ້ຜິດພາດ: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportCount = getExportData().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg, hsl(0,66%,36%), hsl(0,66%,52%))" }}>
              <Download size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-base leading-tight">ນຳອອກ Excel</h3>
              <p className="text-xs text-muted-foreground mt-0.5">ຕິດຕາມລູກຄ້າ — ເລືອກຂໍ້ມູນທີ່ຕ້ອງການ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* ── Section 1: Columns ── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-widest">1. ເລືອກຖັນທີ່ຈະ Export</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedCols(new Set(EXPORT_COLUMNS.map(c => c.key)))}
                  className="text-[11px] font-semibold text-[hsl(0,66%,42%)] hover:underline transition-colors">
                  ເລືອກທັງໝົດ
                </button>
                <span className="text-muted-foreground text-[11px]">·</span>
                <button onClick={() => setSelectedCols(new Set())}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors">
                  ລ້າງທັງໝົດ
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPORT_COLUMNS.map(col => {
                const on = selectedCols.has(col.key);
                return (
                  <label key={col.key}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all select-none ${on ? "border-[hsl(0,66%,42%)] bg-red-50/70" : "border-border hover:bg-muted/50"}`}>
                    <div
                      onClick={() => toggleCol(col.key)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${on ? "border-[hsl(0,66%,42%)] bg-[hsl(0,66%,42%)]" : "border-border bg-background"}`}>
                      {on && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: Period ── */}
          <div>
            <span className="text-[11px] font-bold text-foreground uppercase tracking-widest block mb-2.5">
              2. ເລືອກຊ່ວງ/ກຸ່ມທີ່ຈະ Export
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${period === p.key ? "border-[hsl(0,66%,42%)] bg-red-50 text-[hsl(0,66%,42%)] shadow-sm" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 3: Follow status ── */}
          <div>
            <span className="text-[11px] font-bold text-foreground uppercase tracking-widest block mb-2.5">
              3. ເລືອກຕາມສະຖານະຕິດຕາມ
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_FOLLOW.map(f => (
                <button key={f.key} onClick={() => setFollowSt(f.key)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${followSt === f.key ? "border-[hsl(0,66%,42%)] bg-red-50 text-[hsl(0,66%,42%)] shadow-sm" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Preview count ── */}
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3 border border-border">
            <FileSpreadsheet size={16} className="text-[hsl(0,66%,42%)] flex-shrink-0" />
            <span className="text-sm text-foreground">
              ຈະ Export{" "}
              <span className="font-black text-[hsl(0,66%,42%)]">{exportCount}</span>
              {" "}ລາຍການ,{" "}
              <span className="font-black text-[hsl(0,66%,42%)]">{selectedCols.size}</span>
              {" "}ຖັນ
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-2.5">
              <AlertTriangle size={13} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            ຍົກເລີກ
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            style={{ background: "hsl(0,66%,42%)" }}>
            {exporting
              ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>
              : <><Download size={13} /> ດາວໂຫລດ Excel</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tracking() {
  // ─── ພາລາມິເຕີ highlight ຈາກ Dashboard ──────────────────────────
  const _hlStore = (() => {
    try {
      const raw = sessionStorage.getItem("tracking_highlight");
      if (!raw) return null;
      sessionStorage.removeItem("tracking_highlight");
      return JSON.parse(raw);
    } catch { return null; }
  })();
  const [highlightId] = useState(() => _hlStore?.id ? String(_hlStore.id) : null);
  const [autoOpenRenewId] = useState(() => (_hlStore?.autoRenew && _hlStore?.id) ? String(_hlStore.id) : null);
  const [highlightActive, setHighlightActive] = useState(!!highlightId);
  const highlightScrolled = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (highlightId) return "all";
    try {
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex !== -1) {
        const params = new URLSearchParams(hash.slice(qIndex + 1));
        if (params.get("search")) return "all";
        const tab = params.get("tab");
        const validTabs = ["expiring", "expired_1", "expired_2", "expired_3", "all"];
        if (tab && validTabs.includes(tab)) return tab;
      }
    } catch {}
    const saved = sessionStorage.getItem("tracking_init_tab");
    if (saved) {
      sessionStorage.removeItem("tracking_init_tab");
      return saved;
    }
    return "expiring";
  });
  const [search, setSearch] = useState(() => {
    const saved = sessionStorage.getItem("tracking_init_search");
    if (saved) {
      sessionStorage.removeItem("tracking_init_search");
      return saved;
    }
    try {
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex === -1) return "";
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      return params.get("search") ?? "";
    } catch { return ""; }
  });
  const [followFilter, setFollowFilter] = useState(() => {
    try {
      const stored = sessionStorage.getItem("tracking_follow_filter");
      if (stored) {
        sessionStorage.removeItem("tracking_follow_filter");
        return stored;
      }
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex === -1) return "";
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      return params.get("follow_up") ?? "";
    } catch { return ""; }
  });
  const [page, setPage] = useState(1);
  const [showExport,        setShowExport]        = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const PAGE_SIZE = 20;

  const { user } = useAuth();

  // ── ຂຽນ state ກັບ URL ທຸກເທື່ອທີ່ tab/filter/search ປ່ຽນ ──
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const baseHash = hash.split("?")[0] || "#/tracking";
      const params = new URLSearchParams();
      if (activeTab !== "expiring") params.set("tab", activeTab);
      if (search) params.set("search", search);
      if (followFilter) params.set("follow_up", followFilter);
      const qs = params.toString();
      const newHash = qs ? `${baseHash}?${qs}` : baseHash;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, "", window.location.pathname + newHash);
      }
    } catch {}
  }, [activeTab, search, followFilter]);

  // ── ດຶງລູກຄ້າທຸກຄົນໂດຍບໍ່ມີ range limit (ຮັບປະກັນທຸກ record) ──
  const { data: allCustomers = [], isLoading } = useQuery({
    queryKey: ["/api/customers/all-tracking"],
    queryFn: async () => {
      const PAGE = 1000;
      let from = 0;
      let all = [];
      while (true) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data.map(customerFromDb));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    staleTime: 30_000,
  });
  const updateCustomer = useUpdateCustomer();
  const { data: packages = [] } = useListPackages();
  const qc = useQueryClient();

  const now = new Date();

  const filtered = useMemo(() => {
    let list = allCustomers;

    // ── ເວລາພິມຄົ້ນຫາ: ຂ້າມ tab/follow filter ຄົ້ນຫາທຸກຄົນ ──
    if (search) {
      const q = search.toLowerCase();
      return list
        .filter(c =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q) ||
          (c.accountId ?? "").toLowerCase().includes(q) ||
          (c.followUpPerson ?? "").toLowerCase().includes(q) ||
          (c.remarks ?? "").toLowerCase().includes(q)
        )
        .sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return differenceInDays(parseISO(a.expiryDate), now) - differenceInDays(parseISO(b.expiryDate), now);
        });
    }

    if (!followFilter) {
      if (activeTab === "expiring") {
        list = list.filter(c => {
          if (!c.expiryDate) return false;
          const d = differenceInDays(parseISO(c.expiryDate), now);
          return c.status === "active" && d >= -1 && d <= 30;
        });
      } else if (activeTab === "expired_1") {
        list = list.filter(c => {
          if (!c.expiryDate) return false;
          const days = differenceInDays(now, parseISO(c.expiryDate));
          return days > 0 && Math.floor(days / 30) < 6;
        });
      } else if (activeTab === "expired_2") {
        list = list.filter(c => {
          if (!c.expiryDate) return false;
          const days = differenceInDays(now, parseISO(c.expiryDate));
          const months = Math.floor(days / 30);
          return days > 0 && months >= 6 && months < 12;
        });
      } else if (activeTab === "expired_3") {
        list = list.filter(c => {
          if (!c.expiryDate) return false;
          const days = differenceInDays(now, parseISO(c.expiryDate));
          return days > 0 && Math.floor(days / 30) >= 12;
        });
      }
    }

    if (followFilter) list = list.filter(c => c.followUpStatus === followFilter);

    return list.sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return differenceInDays(parseISO(a.expiryDate), now) - differenceInDays(parseISO(b.expiryDate), now);
    });
  }, [allCustomers, activeTab, search, followFilter]);

  const counts = useMemo(() => {
    const c = { expiring: 0, expired_1: 0, expired_2: 0, expired_3: 0, all: allCustomers.length };
    for (const cust of allCustomers) {
      if (!cust.expiryDate) continue;
      const d = differenceInDays(parseISO(cust.expiryDate), now);
      if (cust.status === "active" && d >= -1 && d <= 30) c.expiring++;
      const daysPast = differenceInDays(now, parseISO(cust.expiryDate));
      if (daysPast > 0) {
        const months = Math.floor(daysPast / 30);
        if (months < 6) c.expired_1++;
        else if (months < 12) c.expired_2++;
        else c.expired_3++;
      }
    }
    return c;
  }, [allCustomers]);

  const followStats = useMemo(() => {
    const s = {};
    for (const step of FOLLOW_STEPS) {
      s[step.value] = allCustomers.filter(c => c.followUpStatus === step.value).length;
    }
    s[""] = allCustomers.filter(c => !c.followUpStatus).length;
    return s;
  }, [allCustomers]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const handleUpdate = async (id, patch) => {
    await updateCustomer.mutateAsync({ id, data: patch });
    qc.invalidateQueries();
  };

  // ─── Highlight: ຫຼັງ data ໂຫລດ → ຄຳນວນໜ້າ → scroll ──────────
  useEffect(() => {
    if (!highlightId || highlightScrolled.current) return;
    if (isLoading || allCustomers.length === 0) return;

    // ຈັດລຽງ "all" list ຄືກັນກັບ filtered ຕອນ tab=all, ບໍ່ search
    const sortedAll = [...allCustomers].sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return (
        differenceInDays(parseISO(a.expiryDate), now) -
        differenceInDays(parseISO(b.expiryDate), now)
      );
    });

    const idx = sortedAll.findIndex(c => String(c.id) === String(highlightId));
    if (idx === -1) return;

    const targetPage = Math.ceil((idx + 1) / PAGE_SIZE);
    setPage(targetPage);

    // ລໍ DOM render ກ່ອນ scroll (500ms)
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`card-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightScrolled.current = true;
      }
    }, 500);

    // ລຶບ highlight ຫຼັງ 4 ວິ
    const clearTimer = setTimeout(() => setHighlightActive(false), 4000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightId, isLoading, allCustomers.length]);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {showExport && (
        <TrackingExportModal
          onClose={() => setShowExport(false)}
          filtered={filtered}
          packages={packages}
        />
      )}
      {showMonthlyReport && (
        <TrackingMonthlyReportModal
          onClose={() => setShowMonthlyReport(false)}
          allCustomers={allCustomers}
          packages={packages}
          currentUser={user}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity size={22} className="text-[hsl(0,66%,42%)]" /> ຕິດຕາມລູກຄ້າ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ຕິດຕາມ, ອັບເດດ ແລະ ບັນທຶກຄວາມຄືບໜ້າລູກຄ້າ</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowMonthlyReport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <BarChart2 size={15} className="text-[hsl(0,66%,42%)]" />
            ລາຍງານປະຈຳເດືອນ
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <Download size={15} className="text-[hsl(0,66%,42%)]" />
            ນຳອອກ Excel
          </button>
        </div>
      </div>

      {/* Follow-up stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FOLLOW_STEPS.map(step => (
          <button
            key={step.value}
            onClick={() => { setFollowFilter(f => f === step.value ? "" : step.value); setPage(1); }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
              followFilter === step.value ? `border-[hsl(0,66%,42%)] bg-red-50` : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${step.cls}`} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground leading-tight">{step.label}</div>
              <div className="text-lg font-black text-foreground">{followStats[step.value] ?? 0}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Period tabs */}
      <div className="flex flex-wrap gap-1.5">
        {PERIOD_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? `${tab.bg} ${tab.color} ${tab.border} shadow-sm`
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
            {tab.label}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-white/70" : "bg-muted"}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="ຄົ້ນຫາ ຊື່, ເບີໂທ, Account, ຜູ້ຕິດຕາມ..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        {followFilter && (
          <button onClick={() => setFollowFilter("")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
            <X size={12} /> ລ້າງ Filter
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
            ກຳລັງໂຫລດ...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-sm font-medium">ບໍ່ພົບລາຍການ</p>
            {(search || followFilter) && (
              <button onClick={() => { setSearch(""); setFollowFilter(""); }} className="text-xs text-[hsl(0,66%,42%)] font-semibold hover:underline">
                ລ້າງການຄົ້ນຫາ
              </button>
            )}
          </div>
        ) : (
          <>
            {/* summary bar */}
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users size={13} />
                <span><span className="font-bold text-foreground">{filtered.length}</span> ລາຍການ</span>
                {followFilter && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${FOLLOW_STEPS.find(s => s.value === followFilter)?.light}`}>
                    {followFilter}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">ກົດ ● ເທິງ stepper ເພື່ອອັດເດດສະຖານະ</span>
            </div>

            <div className="divide-y divide-border">
              {paginated.map(c => (
                <TrackingCard
                  key={c.id}
                  customer={c}
                  onUpdate={handleUpdate}
                  currentUser={user}
                  packages={packages}
                  isHighlighted={highlightActive && String(c.id) === String(highlightId)}
                  autoOpenRenew={!!autoOpenRenewId && String(c.id) === String(autoOpenRenewId)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  ໜ້າ <span className="font-bold">{page}</span> / {totalPages}
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
