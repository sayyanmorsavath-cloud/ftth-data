import { useParams, useLocation } from "wouter";
import { useGetCustomer, useUpdateCustomer, useListPackages } from "@/lib/store";
import { useAuth } from "@/auth/AuthContext";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";
import { FullEditModal } from "@/pages/Customers";
import {
  ChevronLeft, Star, Phone, MapPin, Wifi,
  Calendar, Edit2, RotateCcw, MessageSquare,
  CheckCircle2, XCircle, PauseCircle, AlertTriangle,
  UserCheck, FileText, Zap, Shield, Clock,
  Copy, Check, User, Building2, Activity,
} from "lucide-react";
import { format, parseISO, differenceInDays, addMonths, subDays } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CUSTOMERS_KEY } from "@/lib/store/customers";

const STATUS_CFG = {
  active:    { label: "ໃຊ້ງານ",    color: "#10b981", bg: "bg-emerald-500", pill: "text-emerald-700 bg-emerald-50 border-emerald-200", glow: "shadow-emerald-200", icon: CheckCircle2 },
  inactive:  { label: "ບໍ່ໃຊ້ງານ", color: "#94a3b8", bg: "bg-slate-400",   pill: "text-slate-600 bg-slate-100 border-slate-200",       glow: "shadow-slate-200",  icon: XCircle },
  suspended: { label: "ຖືກລະງັບ",   color: "#f59e0b", bg: "bg-amber-500",   pill: "text-amber-700 bg-amber-50 border-amber-200",        glow: "shadow-amber-200",  icon: PauseCircle },
  expired:   { label: "ໝົດອາຍຸ",    color: "#ef4444", bg: "bg-red-500",     pill: "text-red-700 bg-red-50 border-red-200",             glow: "shadow-red-200",    icon: AlertTriangle },
};

const FOLLOW_PILL = {
  "ຕ້ອງຕິດຕາມ": "text-red-700 bg-red-50 border-red-200",
  "ກຳລັງຕິດຕາມ": "text-amber-700 bg-amber-50 border-amber-200",
  "ຕິດຕາມແລ້ວ":  "text-blue-700 bg-blue-50 border-blue-200",
  "ສຳເລັດ":      "text-emerald-700 bg-emerald-50 border-emerald-200",
};

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 active:bg-white/30 hover:bg-white/20 text-white/70 hover:text-white transition-all flex-shrink-0 touch-manipulation">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CopyBtnDark({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 active:bg-slate-300 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0 touch-manipulation">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function InfoItem({ icon: Icon, iconStyle, label, value, extra }) {
  if (!value && value !== 0) return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconStyle?.bg ?? "#f1f5f9" }}>
        <Icon size={13} style={{ color: iconStyle?.color ?? "#94a3b8" }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</div>
        <div className="text-xs text-slate-300 italic font-normal">—</div>
      </div>
    </div>
  );
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconStyle?.bg ?? "#f1f5f9" }}>
        <Icon size={13} style={{ color: iconStyle?.color ?? "#64748b" }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-slate-700 leading-snug">{value}</span>
          {extra}
        </div>
      </div>
    </div>
  );
}

function GlassCard({ accent, title, icon: Icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100/80 shadow-sm overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: accent + "20" }}>
          <Icon size={12} style={{ color: accent }} />
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: accent + "cc" }}>{title}</span>
      </div>
      <div className="flex-1 min-h-0 px-4 py-1 divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function DaysRing({ days, totalDays }) {
  if (days === null || days === undefined) return null;
  const pct = totalDays > 0 ? Math.min(1, Math.max(0, days / totalDays)) : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const color = days < 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-extrabold" style={{ color }}>{days < 0 ? "ໝົດ" : days === 0 ? "ໝົດ" : days}</span>
        {days > 0 && <span className="text-[10px] text-slate-400 font-semibold">ວັນ</span>}
      </div>
    </div>
  );
}

function ExpiryChip({ date }) {
  if (!date) return null;
  const days = differenceInDays(parseISO(date), new Date());
  const chip = days < 0 ? "text-red-700 bg-red-100 border-red-200"
    : days === 0 ? "text-red-600 bg-red-50 border-red-200"
    : days <= 7 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-emerald-700 bg-emerald-50 border-emerald-200";
  const lbl = days < 0 ? `ໝົດ ${Math.abs(days)}ວ` : days === 0 ? "ໝົດມື້ນີ້" : `ເຫຼືອ ${days}ວ`;
  return (
    <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${chip} ${days === 0 ? "animate-pulse" : ""}`}>{lbl}</span>
  );
}

function RenewModal({ customer, onClose, onSave }) {
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const BONUS = { 1: 0, 3: 1, 6: 2, 12: 4 };
  const total = months + (BONUS[months] ?? 0);
  const baseDate = customer.expiryDate && differenceInDays(parseISO(customer.expiryDate), new Date()) > 0
    ? parseISO(customer.expiryDate)
    : new Date();
  const newExp = subDays(addMonths(baseDate, total), 1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-lg text-slate-800 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center"><RotateCcw size={17} className="text-emerald-600" /></span>
            ຕໍ່ສັນຍາ
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"><XCircle size={16} /></button>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl px-4 py-3.5">
          <div className="font-bold text-base text-slate-800">{customer.name}</div>
          {customer.expiryDate && <div className="text-sm text-slate-500 mt-0.5">ໝົດປັດຈຸບັນ: <span className="font-bold text-slate-700">{format(parseISO(customer.expiryDate), "dd/MM/yyyy")}</span></div>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)}
              className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all ${months === m ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200" : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"}`}>
              {m}ດ{BONUS[m] > 0 && <div className="text-[10px] opacity-70 font-semibold">+{BONUS[m]}</div>}
            </button>
          ))}
        </div>
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <span className="text-emerald-600 text-sm font-semibold">ໝົດໃໝ່: </span>
          <span className="text-emerald-900 font-extrabold">{format(newExp, "dd/MM/yyyy")}</span>
          <span className="text-emerald-500 text-sm ml-1.5">({total} ເດືອນ)</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">ຍົກເລີກ</button>
          <button onClick={async () => { setSaving(true); await onSave({ expiryDate: format(newExp, "yyyy-MM-dd"), status: "active" }); setSaving(false); onClose(); }}
            disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}ຢືນຢັນ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: customer, isLoading, error } = useGetCustomer(id);
  const { data: pkgData } = useListPackages();
  const packages = pkgData?.data ?? [];
  const updateCustomer = useUpdateCustomer();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  const handleSave = async (updates) => {
    await updateCustomer.mutateAsync({ id: customer.id, data: updates });
    qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY, "single", id] });
  };

  if (isLoading) return (
    <div className="h-full flex items-center justify-center gap-3">
      <div className="w-5 h-5 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-400 font-medium">ກຳລັງໂຫລດ...</span>
    </div>
  );

  if (error || !customer) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center"><AlertTriangle size={36} className="text-red-400" /></div>
      <p className="text-slate-400 font-medium">ບໍ່ພົບຂໍ້ມູນລູກຄ້າ</p>
      <button onClick={() => setLocation("/customers")} className="px-6 py-3 rounded-2xl bg-[hsl(0,66%,42%)] text-white font-bold shadow-lg shadow-red-200">ກັບຄືນ</button>
    </div>
  );

  const st = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive;
  const StIcon = st.icon;
  const typeInfo = CUSTOMER_TYPES.find(t => t.code === customer.customerType);
  const daysLeft = customer.expiryDate ? differenceInDays(parseISO(customer.expiryDate), new Date()) : null;
  const totalDays = customer.startDate && customer.expiryDate
    ? differenceInDays(parseISO(customer.expiryDate), parseISO(customer.startDate))
    : 30;

  // Hero gradient based on status
  const heroGrad = customer.status === "active" && daysLeft !== null && daysLeft > 7
    ? { from: "hsl(0,66%,42%)", to: "hsl(0,55%,22%)", mid: "hsl(0,60%,32%)" }
    : customer.status === "expired"   ? { from: "#b91c1c", to: "#450a0a", mid: "#7f1d1d" }
    : customer.status === "suspended" ? { from: "#d97706", to: "#451a03", mid: "#92400e" }
    : { from: "#475569", to: "#0f172a", mid: "#1e293b" };

  return (
    <div className="min-h-full flex flex-col bg-slate-50/80 p-3 gap-2 overflow-x-hidden">

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <button onClick={() => setLocation("/customers")}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors group px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm">
          <ChevronLeft size={17} className="group-hover:-translate-x-0.5 transition-transform" />
          ກັບຄືນ
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => {
              sessionStorage.setItem("tracking_init_search", customer.name ?? "");
              setLocation("/tracking");
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-orange-600 text-xs font-bold border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
            <MessageSquare size={13} /> <span className="hidden sm:inline">ຕິດຕາມ</span>
          </button>
          <button onClick={() => setRenewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-emerald-700 text-xs font-bold border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
            <RotateCcw size={13} /> <span className="hidden sm:inline">ຕໍ່ສັນຍາ</span>
          </button>
          {isAdmin && (
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-blue-700 text-xs font-bold border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
              <Edit2 size={13} /> <span className="hidden sm:inline">ແກ້ໄຂ</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Premium hero banner ── */}
      <div className="flex-shrink-0 rounded-3xl overflow-hidden shadow-xl relative"
        style={{ background: `linear-gradient(135deg, ${heroGrad.from} 0%, ${heroGrad.mid} 50%, ${heroGrad.to} 100%)` }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent 70%)" }} />
          <div className="absolute -bottom-20 -left-8 w-72 h-72 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white, transparent 70%)" }} />
          {/* Mesh dots */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />
        </div>

        <div className="relative px-4 py-3 flex flex-col sm:grid sm:grid-cols-3 items-start sm:items-center gap-3 min-w-0">

          {/* ── LEFT: Avatar + Name ── */}
          <div className="flex items-center gap-3 min-w-0 w-full">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-inner">
                {customer.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              {customer.vip && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/40">
                  <Star size={10} className="fill-white text-white" />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${st.bg} rounded-full border-2 border-white shadow-sm`} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-base sm:text-lg text-white tracking-tight leading-tight truncate">{customer.name}</h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {customer.vip && (
                  <span className="text-[10px] font-black text-amber-200 bg-amber-500/25 border border-amber-300/30 px-2 py-0.5 rounded-full">✦ VIP</span>
                )}
                {typeInfo && (
                  <span className="text-[10px] font-bold text-white/65 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    {typeInfo.emoji} {typeInfo.label}
                  </span>
                )}
                {/* Show status inline on mobile */}
                <span className={`sm:hidden inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.pill}`}>
                  <StIcon size={10} />{st.label}
                </span>
              </div>
            </div>
          </div>

          {/* ── CENTER: Account ID + Phone ── */}
          <div className="flex flex-col items-start sm:items-center gap-1 min-w-0 w-full sm:w-auto">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45">Account ID</span>
            <div className="flex items-center gap-2 max-w-full min-w-0">
              <span className="font-mono font-black text-xl sm:text-2xl text-white tracking-wider drop-shadow-sm truncate min-w-0">
                {customer.accountId ?? "—"}
              </span>
              {customer.accountId && <CopyBtn text={customer.accountId} />}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {customer.phone.split("/").filter(Boolean).map((p, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-xl px-2 py-0.5 min-w-0">
                    <Phone size={10} className="text-white/60 flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-white/85 tracking-wide">{p.trim()}</span>
                    <CopyBtn text={p.trim()} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Status + Speed + Days (hidden on mobile, shown on sm+) ── */}
          <div className="hidden sm:flex flex-col items-end gap-2">
            <span className={`flex items-center gap-1.5 text-sm font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${st.pill}`}>
              <StIcon size={14} />{st.label}
            </span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {customer.speed && (
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5">
                  <Wifi size={13} className="text-white/70" />
                  <span className="text-sm font-extrabold text-white">{customer.speed}</span>
                </div>
              )}
              {daysLeft !== null && (
                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-sm font-extrabold ${
                  daysLeft < 0 ? "bg-red-500/30 border-red-400/30 text-white" :
                  daysLeft <= 7 ? "bg-amber-400/30 border-amber-300/30 text-white" :
                  "bg-white/10 border-white/15 text-white"
                }`}>
                  <Clock size={13} className="opacity-75" />
                  {daysLeft < 0 ? `ໝົດ ${Math.abs(daysLeft)} ວ` : daysLeft === 0 ? "ໝົດມື້ນີ້" : `${daysLeft} ວັນ`}
                </div>
              )}
            </div>
          </div>
          {/* Speed + Days on mobile */}
          <div className="flex sm:hidden items-center gap-2 flex-wrap">
            {customer.speed && (
              <div className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1">
                <Wifi size={11} className="text-white/70" />
                <span className="text-xs font-extrabold text-white">{customer.speed}</span>
              </div>
            )}
            {daysLeft !== null && (
              <div className={`flex items-center gap-1 rounded-xl px-2.5 py-1 border text-xs font-extrabold ${
                daysLeft < 0 ? "bg-red-500/30 border-red-400/30 text-white" :
                daysLeft <= 7 ? "bg-amber-400/30 border-amber-300/30 text-white" :
                "bg-white/10 border-white/15 text-white"
              }`}>
                <Clock size={11} className="opacity-75" />
                {daysLeft < 0 ? `ໝົດ ${Math.abs(daysLeft)} ວ` : daysLeft === 0 ? "ໝົດມື້ນີ້" : `${daysLeft} ວັນ`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

        {/* ── LEFT ── */}
        <div className="flex flex-col gap-2 min-h-0">

          <GlassCard accent="#3b82f6" title="ຕິດຕໍ່ & ທີ່ຢູ່" icon={User} className="flex-shrink-0">
            {customer.phone
              ? customer.phone.split("/").filter(Boolean).map((p, i) => (
                  <InfoItem key={i} icon={Phone} iconStyle={{ bg: "#eff6ff", color: "#3b82f6" }}
                    label={i === 0 ? "ເບີໂທ" : "ເບີໂທ 2"}
                    value={p.trim()}
                    extra={<CopyBtnDark text={p.trim()} />} />
                ))
              : <InfoItem icon={Phone} iconStyle={{ bg: "#eff6ff", color: "#3b82f6" }} label="ເບີໂທ" value={null} />
            }
            <InfoItem icon={MapPin} iconStyle={{ bg: "#fff1f2", color: "#f43f5e" }} label="ທີ່ຢູ່" value={customer.address || null} />
            <InfoItem icon={Building2} iconStyle={{ bg: "#f8fafc", color: "#64748b" }} label="ເມືອງ" value={customer.city || null} />
          </GlassCard>

          <GlassCard accent="#8b5cf6" title="ການຕິດຕາມ" icon={UserCheck} className="flex-shrink-0">
            <InfoItem icon={Activity} iconStyle={{ bg: "#f5f3ff", color: "#8b5cf6" }} label="ສະຖານະ"
              value={customer.followUpStatus || null}
              extra={customer.followUpStatus
                ? <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${FOLLOW_PILL[customer.followUpStatus] ?? "bg-muted text-muted-foreground border-border"}`}>{customer.followUpStatus}</span>
                : null} />
            <InfoItem icon={UserCheck} iconStyle={{ bg: "#eef2ff", color: "#6366f1" }} label="ຜູ້ຮັບຜິດຊອບ" value={customer.followUpPerson || null} />
          </GlassCard>

          <GlassCard accent="#64748b" title="ໝາຍເຫດ" icon={FileText} className="flex-1 min-h-0">
            <div className="py-3 flex-1 min-h-0 overflow-hidden">
              {customer.remarks
                ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{customer.remarks}</p>
                : <p className="text-sm text-slate-300 italic font-normal">ບໍ່ມີໝາຍເຫດ</p>}
            </div>
          </GlassCard>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col gap-2 min-h-0">

          <GlassCard accent="hsl(0,66%,42%)" title="ການໃຫ້ບໍລິການ" icon={Wifi} className="flex-shrink-0">
            <InfoItem icon={Wifi} iconStyle={{ bg: "#fff1f0", color: "hsl(0,66%,42%)" }} label="ຄວາມໄວ"
              value={customer.speed}
              extra={customer.speed ? <span className="text-xs font-extrabold text-[hsl(0,66%,42%)] bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{customer.speed}</span> : null} />
            <InfoItem icon={Shield} iconStyle={{ bg: "#eef2ff", color: "#6366f1" }} label="ປະເພດ"
              value={typeInfo ? `${typeInfo.emoji} ${typeInfo.label}` : customer.customerType} />
            <InfoItem icon={Star} iconStyle={{ bg: customer.vip ? "#fffbeb" : "#f8fafc", color: customer.vip ? "#f59e0b" : "#94a3b8" }} label="VIP"
              value={customer.vip ? "ລູກຄ້າ VIP" : "ບໍ່ແມ່ນ VIP"}
              extra={customer.vip ? <Star size={13} className="fill-amber-400 text-amber-400" /> : null} />
            <InfoItem icon={Zap} iconStyle={{ bg: "#f0fdf4", color: "#10b981" }} label="Bonus ເດືອນ"
              value={customer.bonusMonthUsed ? "ໃຊ້ແລ້ວ" : "ຍັງບໍ່ໄດ້ໃຊ້"} />
          </GlassCard>

          <GlassCard accent="#10b981" title="ໄລຍະສັນຍາ" icon={Calendar} className="flex-shrink-0">
            <InfoItem icon={Zap} iconStyle={{ bg: "#fff7ed", color: "#f97316" }} label="ວັນຕິດຕັ້ງ"
              value={customer.installationDate ? format(parseISO(customer.installationDate), "dd/MM/yyyy") : null} />
            <InfoItem icon={Calendar} iconStyle={{ bg: "#f0fdf4", color: "#10b981" }} label="ວັນເລີ່ມ"
              value={customer.startDate ? format(parseISO(customer.startDate), "dd/MM/yyyy") : null} />
            <InfoItem icon={Clock} iconStyle={{ bg: "#fff1f2", color: "#f43f5e" }} label="ວັນໝົດ"
              value={customer.expiryDate ? format(parseISO(customer.expiryDate), "dd/MM/yyyy") : null}
              extra={<ExpiryChip date={customer.expiryDate} />} />
          </GlassCard>

          <div className="bg-white rounded-xl border border-slate-100/80 shadow-sm flex-shrink-0" style={{ borderLeftColor: "#94a3b8", borderLeftWidth: 3 }}>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#94a3b820" }}>
                <Shield size={12} style={{ color: "#94a3b8" }} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#94a3b8cc" }}>ຂໍ້ມູນລະບົບ</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-50 px-1 py-1">
              {customer.createdAt && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#f8fafc" }}>
                    <Calendar size={11} style={{ color: "#94a3b8" }} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">ສ້າງເມື່ອ</div>
                    <div className="text-xs font-bold text-slate-600 leading-snug">{format(parseISO(customer.createdAt), "dd/MM/yy HH:mm")}</div>
                  </div>
                </div>
              )}
              {customer.updatedAt && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#f8fafc" }}>
                    <Clock size={11} style={{ color: "#94a3b8" }} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">ອັບເດດລ່າສຸດ</div>
                    <div className="text-xs font-bold text-slate-600 leading-snug">{format(parseISO(customer.updatedAt), "dd/MM/yy HH:mm")}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <FullEditModal customer={customer} packages={packages}
          onClose={() => setEditOpen(false)}
          onSave={async (data) => { await handleSave(data); setEditOpen(false); }} />
      )}
      {renewOpen && (
        <RenewModal customer={customer} onClose={() => setRenewOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}
