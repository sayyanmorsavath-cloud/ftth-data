// ════════════════════════════════════════════════════════════════
// Portal.jsx
// ໜ້າ self-service ສຳລັບລູກຄ້າ — ກວດສະຖານະ ໂດຍບໍ່ຕ້ອງ login
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import { supabase, customerFromDb } from "@/lib/supabase";
import {
  Search, Wifi, Calendar, Phone, MapPin, Star,
  CheckCircle2, AlertTriangle, XCircle, PauseCircle,
  RefreshCw, Package, Clock, Shield,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

const STATUS_CFG = {
  active:    { label: "ໃຊ້ງານ",    color: "#10b981", bg: "from-emerald-500 to-emerald-600", icon: CheckCircle2,  pill: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  expired:   { label: "ໝົດອາຍຸ",   color: "#ef4444", bg: "from-red-500 to-red-600",         icon: AlertTriangle, pill: "bg-red-100 text-red-700 border-red-300" },
  inactive:  { label: "ບໍ່ໃຊ້ງານ", color: "#94a3b8", bg: "from-slate-400 to-slate-500",     icon: XCircle,       pill: "bg-slate-100 text-slate-600 border-slate-300" },
  suspended: { label: "ຖືກລະງັບ",  color: "#f59e0b", bg: "from-amber-500 to-amber-600",     icon: PauseCircle,   pill: "bg-amber-100 text-amber-700 border-amber-300" },
};

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
        <div className="text-red-700 font-black text-lg">ໝົດອາຍຸ {Math.abs(days)} ວັນແລ້ວ</div>
        <div className="text-red-500 text-xs mt-0.5">ກະລຸນາຕໍ່ສັນຍາດ່ວນ</div>
      </div>
    );
  }
  if (days <= 7) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
        <div className="text-amber-700 font-black text-lg">ເຫຼືອ {days} ວັນ</div>
        <div className="text-amber-500 text-xs mt-0.5">ໃກ້ໝົດສັນຍາ — ກະລຸນາກຽມຕໍ່</div>
      </div>
    );
  }
  if (days <= 30) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
        <div className="text-blue-700 font-black text-lg">ເຫຼືອ {days} ວັນ</div>
        <div className="text-blue-500 text-xs mt-0.5">ໝົດສັນຍາ {format(parseISO(expiryDate), "dd/MM/yyyy")}</div>
      </div>
    );
  }
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
      <div className="text-emerald-700 font-black text-lg">ເຫຼືອ {days} ວັນ</div>
      <div className="text-emerald-500 text-xs mt-0.5">ສັນຍາໝົດ {format(parseISO(expiryDate), "dd/MM/yyyy")}</div>
    </div>
  );
}

function CustomerCard({ customer }) {
  const cfg = STATUS_CFG[customer.status] ?? STATUS_CFG.inactive;
  const Icon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
      {/* Header gradient */}
      <div className={`bg-gradient-to-r ${cfg.bg} p-5 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl shadow-lg">
            {customer.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-xl leading-snug">{customer.name}</span>
              {customer.vip && <Star size={14} className="text-amber-300 fill-amber-300" />}
            </div>
            <div className="font-mono text-sm text-white/80 mt-0.5">{customer.accountId ?? "—"}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon size={18} className="text-white/80" />
            <span className="text-xs text-white/80 font-bold">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Expiry status */}
        <ExpiryBadge expiryDate={customer.expiryDate} />

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Wifi size={12} /> <span className="text-[10px] font-semibold uppercase tracking-wider">ຄວາມໄວ</span>
            </div>
            <div className="font-black text-foreground">{customer.speed ?? "—"}</div>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Calendar size={12} /> <span className="text-[10px] font-semibold uppercase tracking-wider">ໝົດສັນຍາ</span>
            </div>
            <div className="font-black text-foreground text-sm">
              {customer.expiryDate ? format(parseISO(customer.expiryDate), "dd/MM/yyyy") : "—"}
            </div>
          </div>
          {customer.phone && (
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Phone size={12} /> <span className="text-[10px] font-semibold uppercase tracking-wider">ເບີໂທ</span>
              </div>
              <div className="font-bold text-foreground text-sm">{customer.phone}</div>
            </div>
          )}
          {customer.address && (
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <MapPin size={12} /> <span className="text-[10px] font-semibold uppercase tracking-wider">ທີ່ຢູ່</span>
              </div>
              <div className="font-semibold text-foreground text-sm truncate">{customer.address}</div>
            </div>
          )}
        </div>

        {/* Contact us */}
        <div className="bg-[hsl(0,66%,42%)]/5 border border-[hsl(0,66%,42%)]/20 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">ຕ້ອງການຕໍ່ສັນຍາ ຫຼື ສອບຖາມ?</p>
          <p className="text-sm font-bold text-[hsl(0,66%,42%)] mt-0.5">ຕິດຕໍ່ LTC FTTH ໄດ້ທຸກເວລາ</p>
        </div>
      </div>
    </div>
  );
}

export default function Portal() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    if (q.length < 6) {
      setError("ກະລຸນາໃສ່ຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ ເພື່ອຄົ້ນຫາ");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const { data, error: err } = await supabase
        .from("customers")
        .select("*")
        .or(
          `phone.eq.${q},account_id.ilike.${q}%`
        )
        .limit(5);

      if (err) throw err;
      const mapped = (data ?? []).map(customerFromDb);
      setResults(mapped);
      if (mapped.length === 0) setError("ບໍ່ພົບຂໍ້ມູນ — ກວດສອບເບີໂທ ຫຼື ລະຫັດລູກຄ້າ");
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen"
      style={{ background: "linear-gradient(160deg, hsl(0,72%,36%) 0%, hsl(0,60%,28%) 100%)" }}
    >
      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-center text-white space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 shadow-xl">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black">LTC FTTH Portal</h1>
        <p className="text-white/70 text-sm">ກວດສອບສະຖານະ Internet ຂອງທ່ານ</p>
      </div>

      {/* Search Box */}
      <div className="px-4 pb-6 max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-3 border border-white/20">
          <p className="text-white/80 text-sm font-medium">ໃສ່ເບີໂທ ຫຼື ລະຫັດລູກຄ້າ</p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="ເຊັ່ນ: 020XXXXXXXX ຫຼື LTC-001"
              className="flex-1 px-4 py-3 rounded-xl bg-white text-foreground text-sm font-medium focus:outline-none shadow-sm"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-3 rounded-xl bg-white/90 text-[hsl(0,66%,42%)] font-bold text-sm hover:bg-white transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              {loading
                ? <RefreshCw size={15} className="animate-spin" />
                : <Search size={15} />}
              ຄົ້ນຫາ
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pb-10 max-w-md mx-auto space-y-4">
        {error && (
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center text-white/80 text-sm">
            {error}
          </div>
        )}
        {results?.map(c => <CustomerCard key={c.id} customer={c} />)}
      </div>
    </div>
  );
}
