// ════════════════════════════════════════════════════════════════
// CustomerMap.jsx
// ແຜນທີ່ລູກຄ້າ — ຈັດກຸ່ມຕາມເມືອງ / ທີ່ຢູ່ ພ້ອມ Google Maps link
// ════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, customerFromDb } from "@/lib/supabase";
import {
  MapPin, Search, X, Users, ChevronDown, ChevronUp,
  ExternalLink, Phone, Wifi, RefreshCw, Navigation,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";

// ─── ດຶງລູກຄ້າທັງໝົດ (city, address, status) ─────────────────
function useAllCustomersForMap() {
  return useQuery({
    queryKey: ["/api/customers-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, address, city, speed, status, expiry_date, account_id")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(customerFromDb);
    },
    staleTime: 60_000,
  });
}

const STATUS_CFG = {
  active:    { label: "ໃຊ້ງານ",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  expired:   { label: "ໝົດອາຍຸ",   cls: "bg-red-100 text-red-700 border-red-200",             dot: "bg-red-500",     icon: AlertTriangle },
  inactive:  { label: "ບໍ່ໃຊ້ງານ", cls: "bg-slate-100 text-slate-600 border-slate-200",       dot: "bg-slate-400",   icon: XCircle },
  suspended: { label: "ຖືກລະງັບ",  cls: "bg-amber-100 text-amber-700 border-amber-200",       dot: "bg-amber-500",   icon: XCircle },
};

function openGoogleMaps(address, city) {
  const q = encodeURIComponent([address, city, "ລາວ"].filter(Boolean).join(", "));
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

function CustomerRow({ c }) {
  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.inactive;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{c.name}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {c.phone && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone size={9} /> {c.phone}
            </span>
          )}
          {c.speed && (
            <span className="flex items-center gap-1 text-[11px] text-[hsl(0,66%,42%)] font-bold">
              <Wifi size={9} /> {c.speed}
            </span>
          )}
        </div>
        {c.address && (
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.address}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
          {cfg.label}
        </span>
        <button
          onClick={() => openGoogleMaps(c.address, c.city)}
          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors"
          title="ເບິ່ງໃນ Google Maps"
        >
          <Navigation size={11} className="text-blue-600" />
        </button>
      </div>
    </div>
  );
}

function CityCard({ city, customers }) {
  const [open, setOpen] = useState(false);
  const active   = customers.filter(c => c.status === "active").length;
  const expired  = customers.filter(c => c.status === "expired").length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-sm">{city || "ບໍ່ລະບຸທີ່ຢູ່"}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{customers.length} ລາຍ</span>
            {active > 0   && <span className="text-[10px] font-bold text-emerald-600">✓ {active} ໃຊ້ງານ</span>}
            {expired > 0  && <span className="text-[10px] font-bold text-red-600">✗ {expired} ໝົດ</span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); openGoogleMaps("", city); }}
          className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center mr-2"
          title="ເບິ່ງເມືອງໃນ Google Maps"
        >
          <ExternalLink size={11} className="text-blue-600" />
        </button>
        {open ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-2 pt-1">
          {customers.map(c => <CustomerRow key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}

export default function CustomerMap() {
  const { data: customers = [], isLoading } = useAllCustomersForMap();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const s = search.toLowerCase();
    return customers.filter(c =>
      (c.name ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s) ||
      (c.address ?? "").toLowerCase().includes(s) ||
      (c.phone ?? "").includes(s)
    );
  }, [customers, search]);

  // ─── Group by city ────────────────────────────────────────────
  const byCity = useMemo(() => {
    const m = {};
    for (const c of filtered) {
      const key = c.city || "";
      if (!m[key]) m[key] = [];
      m[key].push(c);
    }
    return Object.entries(m)
      .sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const total   = customers.length;
  const active  = customers.filter(c => c.status === "active").length;
  const expired = customers.filter(c => c.status === "expired").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-lg">
          <MapPin size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">ແຜນທີ່ລູກຄ້າ</h1>
          <p className="text-xs text-muted-foreground">ຈັດກຸ່ມຕາມທີ່ຕັ້ງ / ເມືອງ</p>
        </div>
      </div>

      {/* ─── Summary Pills ─── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-xl px-3 py-2 text-center">
          <div className="text-lg font-black text-foreground">{total.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">ທັງໝົດ</div>
        </div>
        <div className="bg-emerald-50 rounded-xl px-3 py-2 text-center">
          <div className="text-lg font-black text-emerald-700">{active.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600">ໃຊ້ງານ</div>
        </div>
        <div className="bg-red-50 rounded-xl px-3 py-2 text-center">
          <div className="text-lg font-black text-red-700">{expired.toLocaleString()}</div>
          <div className="text-[10px] text-red-600">ໝົດອາຍຸ</div>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ຄົ້ນຫາຊື່, ທີ່ຢູ່, ເມືອງ, ເບີໂທ..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <RefreshCw size={16} className="animate-spin" /> ກຳລັງໂຫລດ...
        </div>
      ) : byCity.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">ບໍ່ພົບຂໍ້ມູນ</div>
      ) : (
        <div className="space-y-3">
          {byCity.map(([city, custs]) => (
            <CityCard key={city} city={city} customers={custs} />
          ))}
        </div>
      )}
    </div>
  );
}
