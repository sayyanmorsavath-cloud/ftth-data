import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase, customerFromDb, customerToDb } from "@/lib/supabase";
import { PRICE_TABLE, TOTAL_TO_PAID } from "@/lib/pricing";
import { TYPE_MAP } from "@/lib/customerTypes";
import { differenceInMonths, parseISO, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Users, Banknote, CalendarDays, Search, Download,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle, Wifi, Clock,
  RefreshCw, Star, BadgeDollarSign, BarChart2, AlertTriangle,
  CheckCircle2, X, Save, Pencil,
  PauseCircle, XCircle,
} from "lucide-react";
import ExcelJS from "exceljs";

const STANDARD_MONTHS = [1, 4, 8, 16];
const DETAIL_PAGE_SIZE = 25;
const DURATION_LABEL = { 1: "1 ເດືອນ", 4: "3 ເດືອນ (ແຖມ 1)", 8: "6 ເດືອນ (ແຖມ 2)", 16: "12 ເດືອນ (ແຖມ 4)" };
const PAID_LABEL = { 1: "1 ເດືອນ", 3: "3 ເດືອນ", 6: "6 ເດືອນ", 12: "12 ເດືອນ" };
const RED = "hsl(0,66%,42%)";
const SPEED_ORDER = ["35 Mbps","55 Mbps","70 Mbps","80 Mbps","100 Mbps","120 Mbps","160 Mbps","170 Mbps","180 Mbps","300 Mbps","320 Mbps","400 Mbps","480 Mbps"];

const STATUS_CFG = {
  active:    { label: "ໃຊ້ງານ",    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",  dot: "bg-emerald-500", icon: CheckCircle2 },
  inactive:  { label: "ບໍ່ໃຊ້ງານ", cls: "text-slate-600 bg-slate-50 border-slate-200",          dot: "bg-slate-400",   icon: XCircle },
  suspended: { label: "ຖືກລະງັບ",   cls: "text-amber-700 bg-amber-50 border-amber-200",          dot: "bg-amber-500",   icon: PauseCircle },
  expired:   { label: "ໝົດອາຍຸ",    cls: "text-red-700 bg-red-50 border-red-200",               dot: "bg-red-500",     icon: AlertTriangle },
};

// Normalize speed string to PRICE_TABLE key format e.g. "35" → "35 Mbps"
function normalizeSpeed(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (PRICE_TABLE[s]) return s;
  // Try extracting number and rebuilding "N Mbps"
  const n = s.replace(/\s*mbps?/i, "").trim();
  const candidate = n + " Mbps";
  if (PRICE_TABLE[candidate]) return candidate;
  return null;
}

// Resolve the best available speed: own speed > package speed
function resolveSpeed(c) {
  return normalizeSpeed(c.speed) ?? normalizeSpeed(c.packageSpeed) ?? null;
}

// Missing reason flags
function getMissingReason(c) {
  const reasons = [];
  if (!resolveSpeed(c)) reasons.push("speed");
  return reasons;
}

function snapToStandard(months) {
  return STANDARD_MONTHS.reduce((best, m) =>
    Math.abs(m - months) < Math.abs(best - months) ? m : best
  );
}

// Smart revenue calculation:
// Requires: speed (own or from package)
// expiryDate optional — fallback chain: startDate+expiry → expiry only → 1 month assumed
function calcRevenue(c) {
  const speed = resolveSpeed(c);
  if (!speed) return null;
  try {
    let paidMonths = 1;
    let totalMonths = 1;
    let estimated = true;

    if (c.expiryDate) {
      const expiry = parseISO(c.expiryDate);
      let start;
      if (c.startDate) {
        start = parseISO(c.startDate);
        estimated = false;
      } else if (c.installationDate) {
        start = parseISO(c.installationDate);
      } else {
        start = new Date(expiry);
        start.setMonth(start.getMonth() - 1);
      }
      const months = Math.max(1, differenceInMonths(expiry, start) + 1);
      const snapped = snapToStandard(months);
      paidMonths = TOTAL_TO_PAID[snapped];
      totalMonths = snapped;
    }

    const price = PRICE_TABLE[speed]?.[paidMonths];
    if (price == null) return null;
    const usedSpeed = speed;
    return { price, paidMonths, totalMonths, monthlyRate: price / totalMonths, estimated, usedSpeed };
  } catch { return null; }
}

function fmt(n) { return (n ?? 0).toLocaleString("en-US"); }
function fmtM(n) { return (n ?? 0).toLocaleString("en-US") + " ₭"; }
function fmtMil(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " ຕື້";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " ລ້ານ";
  return fmt(n);
}

const SORT_FIELDS = { name: "ຊື່", speed: "ຄວາມໄວ", price: "ລາຄາທີ່ຈ່າຍ", monthlyRate: "ລາຄາ/ເດືອນ", expiryDate: "ໝົດສັນຍາ" };

// ─── Quick Fix Modal ───────────────────────────────────────────────────────────
function QuickFixModal({ customer, onClose, onSave }) {
  const [speed, setSpeed] = useState(customer.speed ?? "");
  const [startDate, setStartDate] = useState(customer.startDate ?? "");
  const [expiryDate, setExpiryDate] = useState(customer.expiryDate ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const missing = getMissingReason(customer);

  const preview = useMemo(() => {
    if (!speed || !expiryDate) return null;
    try {
      const expiry = parseISO(expiryDate);
      let start;
      if (startDate) { start = parseISO(startDate); }
      else { start = new Date(expiry); start.setMonth(start.getMonth() - 1); }
      const months = Math.max(1, differenceInMonths(expiry, start) + 1);
      const snapped = snapToStandard(months);
      const paidMonths = TOTAL_TO_PAID[snapped];
      const price = PRICE_TABLE[speed]?.[paidMonths];
      if (!price) return null;
      return { price, paidMonths, totalMonths: snapped, monthlyRate: price / snapped };
    } catch { return null; }
  }, [speed, startDate, expiryDate]);

  const handleSave = async () => {
    setSaving(true);
    const patch = {};
    if (speed) patch.speed = speed;
    if (startDate) patch.startDate = startDate;
    if (expiryDate) patch.expiryDate = expiryDate;
    await onSave(customer.id, patch);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const canSave = speed && expiryDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,44%) 100%)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                <Pencil size={15} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">ຕື່ມຂໍ້ມູນທີ່ຂາດ</h3>
                <p className="text-white/60 text-[11px] mt-0.5 truncate max-w-[220px]">{customer.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all">
              <X size={14} />
            </button>
          </div>
          {/* Missing flags */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {missing.map(m => (
              <span key={m} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/30 border border-red-300/30 text-white/90">
                ✗ {m === "speed" ? "ຄວາມໄວ" : m === "startDate" ? "ວັນເລີ່ມ" : "ວັນໝົດ"}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Speed */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              ຄວາມໄວ {!customer.speed && <span className="text-red-500 ml-1">* ຂາດ</span>}
            </label>
            <select value={speed} onChange={e => setSpeed(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none transition-colors
                ${!customer.speed ? "border-red-200 bg-red-50 focus:border-red-400" : "border-slate-200 focus:border-[hsl(0,66%,42%)]"}`}>
              <option value="">— ເລືອກຄວາມໄວ —</option>
              {SPEED_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Start date — optional */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              ວັນເລີ່ມ <span className="text-slate-400 font-normal ml-1">(ບໍ່ຕ້ອງການ — ຖ້າຫວ່າງຈະໃຊ້ 1 ເດືອນ)</span>
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors" />
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              ວັນໝົດ {!customer.expiryDate && <span className="text-red-500 ml-1">* ຂາດ</span>}
            </label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm focus:outline-none transition-colors
                ${!customer.expiryDate ? "border-red-200 bg-red-50 focus:border-red-400" : "border-slate-200 focus:border-[hsl(0,66%,42%)]"}`} />
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">ຄາດການລາຍຮັບ</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-emerald-600 font-semibold">ລາຄາທີ່ຈ່າຍ</div>
                  <div className="font-extrabold text-emerald-800 text-base">{fmtM(preview.price)}</div>
                </div>
                <div>
                  <div className="text-emerald-600 font-semibold">ໄລຍະ</div>
                  <div className="font-bold text-emerald-800">{PAID_LABEL[preview.paidMonths]}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
              ຍົກເລີກ
            </button>
            <button onClick={handleSave} disabled={!canSave || saving || saved}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50
                ${saved ? "bg-emerald-500" : "bg-gradient-to-r from-[hsl(0,66%,36%)] to-[hsl(0,66%,48%)]"}`}>
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງບັນທຶກ...</>
                : saved ? <><CheckCircle2 size={15} />ສຳເລັດ!</>
                : <><Save size={14} />ບັນທຶກ</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Revenue() {
  const [search, setSearch] = useState("");
  const [speedFilter, setSpeedFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [sort, setSort] = useState({ field: "price", dir: "desc" });
  const [exporting, setExporting] = useState(false);
  const [fixTarget, setFixTarget] = useState(null);
  const [showMissing, setShowMissing] = useState(true);
  const [detailPage, setDetailPage] = useState(1);
  const qc = useQueryClient();

  // Fetch ALL customers + packages (client-side join for speed fallback)
  const { data: rawCustomers, isLoading, error, refetch } = useQuery({
    queryKey: ["revenue/all-customers"],
    queryFn: async () => {
      const [custRes, pkgRes] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("packages").select("id, speed, name, price"),
      ]);
      if (custRes.error) throw custRes.error;
      const pkgMap = {};
      for (const p of pkgRes.data ?? []) pkgMap[p.id] = p;
      return (custRes.data ?? []).map(row => {
        const pkg = row.package_id ? pkgMap[row.package_id] : null;
        return {
          ...customerFromDb(row),
          packageSpeed: pkg?.speed ?? null,
          packageName: pkg?.name ?? null,
        };
      });
    },
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const row = customerToDb(data);
      const { data: updated, error } = await supabase
        .from("customers").update(row).eq("id", id).select().single();
      if (error) throw error;
      return customerFromDb(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue/all-customers"] });
      refetch();
    },
  });

  const enriched = useMemo(() => {
    if (!rawCustomers) return [];
    return rawCustomers.map(c => ({
      ...c,
      revenue: calcRevenue(c),
      missing: getMissingReason(c),
    }));
  }, [rawCustomers]);

  const withRevenue = useMemo(() => enriched.filter(c => c.revenue != null), [enriched]);
  const noRevenue = useMemo(() => enriched.filter(c => c.revenue == null), [enriched]);

  // Summary across all calculable customers
  const summary = useMemo(() => {
    const total = withRevenue.reduce((s, c) => s + c.revenue.price, 0);
    const monthlyTotal = withRevenue.reduce((s, c) => s + c.revenue.monthlyRate, 0);
    const activeRevenue = withRevenue.filter(c => c.status === "active").reduce((s, c) => s + c.revenue.price, 0);
    const byStatus = {};
    for (const c of enriched) {
      if (!byStatus[c.status]) byStatus[c.status] = { count: 0, revenue: 0 };
      byStatus[c.status].count++;
      if (c.revenue) byStatus[c.status].revenue += c.revenue.price;
    }
    return {
      total,
      activeRevenue,
      monthlyTotal,
      avgPerCustomer: withRevenue.length ? Math.round(total / withRevenue.length) : 0,
      projectedAnnual: Math.round(monthlyTotal * 12),
      count: withRevenue.length,
      noRevenue: noRevenue.length,
      totalCustomers: enriched.length,
      byStatus,
    };
  }, [withRevenue, noRevenue, enriched]);

  const bySpeed = useMemo(() => {
    const map = {};
    for (const c of withRevenue) {
      const spd = c.revenue.usedSpeed ?? c.speed;
      if (!spd) continue;
      if (!map[spd]) map[spd] = { speed: spd, count: 0, total: 0, monthly: 0 };
      map[spd].count++;
      map[spd].total += c.revenue.price;
      map[spd].monthly += c.revenue.monthlyRate;
    }
    return SPEED_ORDER.filter(s => map[s]).map(s => map[s]);
  }, [withRevenue]);

  const byType = useMemo(() => {
    const map = {};
    for (const c of withRevenue) {
      const code = c.customerType ?? "IN";
      if (!map[code]) map[code] = { code, count: 0, total: 0, monthly: 0 };
      map[code].count++;
      map[code].total += c.revenue.price;
      map[code].monthly += c.revenue.monthlyRate;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [withRevenue]);

  const byDuration = useMemo(() => {
    const map = {};
    for (const c of withRevenue) {
      const key = c.revenue.totalMonths;
      if (!map[key]) map[key] = { totalMonths: key, paidMonths: c.revenue.paidMonths, count: 0, total: 0 };
      map[key].count++;
      map[key].total += c.revenue.price;
    }
    return STANDARD_MONTHS.filter(m => map[m]).map(m => map[m]);
  }, [withRevenue]);

  const PAID_MONTHS = [1, 3, 6, 12];
  const PAID_LABEL_SHORT = { 1: "1 ເດືອນ", 3: "3 ເດືອນ", 6: "6 ເດືອນ", 12: "12 ເດືອນ" };
  const PAID_BONUS = { 1: "ຈ່າຍ 1", 3: "+ແຖມ 1", 6: "+ແຖມ 2", 12: "+ແຖມ 4" };

  const bySpeedDuration = useMemo(() => {
    const map = {};
    for (const c of withRevenue) {
      const spd = c.revenue.usedSpeed ?? c.speed;
      if (!spd) continue;
      const pm = c.revenue.paidMonths;
      if (!map[spd]) map[spd] = {};
      if (!map[spd][pm]) map[spd][pm] = { count: 0, total: 0 };
      map[spd][pm].count++;
      map[spd][pm].total += c.revenue.price;
    }
    return map;
  }, [withRevenue]);

  const activeSpeedRows = useMemo(() => SPEED_ORDER.filter(s => bySpeedDuration[s]), [bySpeedDuration]);

  const colTotals = useMemo(() => {
    const totals = {};
    PAID_MONTHS.forEach(m => {
      totals[m] = { count: 0, total: 0 };
      activeSpeedRows.forEach(s => {
        totals[m].count += bySpeedDuration[s]?.[m]?.count ?? 0;
        totals[m].total += bySpeedDuration[s]?.[m]?.total ?? 0;
      });
    });
    return totals;
  }, [bySpeedDuration, activeSpeedRows]);

  // Filtered customer detail table
  const filteredCustomers = useMemo(() => {
    let list = statusTab === "missing" ? noRevenue : withRevenue;
    if (statusTab !== "missing") {
      if (statusTab !== "all") list = list.filter(c => c.status === statusTab);
      if (speedFilter !== "all") list = list.filter(c => c.speed === speedFilter);
      if (typeFilter !== "all") list = list.filter(c => (c.customerType ?? "IN") === typeFilter);
      if (durationFilter !== "all") list = list.filter(c => String(c.revenue?.totalMonths) === durationFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.accountId ?? "").toLowerCase().includes(q) ||
        (c.speed ?? "").toLowerCase().includes(q)
      );
    }
    if (statusTab === "missing") return list;
    return [...list].sort((a, b) => {
      const { field, dir } = sort;
      let av = a[field] ?? a.revenue?.[field] ?? 0;
      let bv = b[field] ?? b.revenue?.[field] ?? 0;
      if (field === "price") { av = a.revenue?.price ?? 0; bv = b.revenue?.price ?? 0; }
      if (field === "monthlyRate") { av = a.revenue?.monthlyRate ?? 0; bv = b.revenue?.monthlyRate ?? 0; }
      if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [withRevenue, noRevenue, statusTab, speedFilter, typeFilter, durationFilter, search, sort]);

  const filteredTotal = useMemo(() =>
    filteredCustomers.reduce((s, c) => s + (c.revenue?.price ?? 0), 0), [filteredCustomers]);
  const filteredMonthly = useMemo(() =>
    filteredCustomers.reduce((s, c) => s + (c.revenue?.monthlyRate ?? 0), 0), [filteredCustomers]);

  // ─── Pagination ──────────────────────────────────────────────
  const totalDetailPages = Math.max(1, Math.ceil(filteredCustomers.length / DETAIL_PAGE_SIZE));
  const safeDetailPage   = Math.min(detailPage, totalDetailPages);
  const pageItems        = filteredCustomers.slice(
    (safeDetailPage - 1) * DETAIL_PAGE_SIZE,
    safeDetailPage * DETAIL_PAGE_SIZE
  );
  useEffect(() => { setDetailPage(1); }, [statusTab, search, speedFilter, typeFilter, durationFilter, sort]);

  function toggleSort(field) {
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
  }

  const handleQuickFix = async (id, patch) => {
    await updateMutation.mutateAsync({ id, data: patch });
    setFixTarget(null);
  };

  async function exportExcel() {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Revenue");
      ws.columns = [
        { header: "ລຳດັບ", key: "no", width: 7 },
        { header: "Account ID", key: "accountId", width: 16 },
        { header: "ຊື່ລູກຄ້າ", key: "name", width: 28 },
        { header: "ສະຖານະ", key: "status", width: 12 },
        { header: "ປະເພດ", key: "type", width: 14 },
        { header: "ຄວາມໄວ", key: "speed", width: 13 },
        { header: "ໄລຍະ (ເດືອນ)", key: "totalMonths", width: 15 },
        { header: "ໄລຍະທີ່ຈ່າຍ", key: "paidMonths", width: 15 },
        { header: "ລາຄາທີ່ຈ່າຍ (₭)", key: "price", width: 20 },
        { header: "ລາຄາ/ເດືອນ (₭)", key: "monthly", width: 20 },
        { header: "ວັນໝົດ", key: "expiry", width: 14 },
      ];
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC62828" } };
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      filteredCustomers.forEach((c, i) => {
        ws.addRow({
          no: i + 1,
          accountId: c.accountId ?? "",
          name: c.name ?? "",
          status: STATUS_CFG[c.status]?.label ?? c.status,
          type: TYPE_MAP[c.customerType]?.label ?? c.customerType ?? "",
          speed: c.speed ?? "",
          totalMonths: c.revenue?.totalMonths ?? "",
          paidMonths: c.revenue?.paidMonths ?? "",
          price: c.revenue?.price ?? 0,
          monthly: c.revenue ? Math.round(c.revenue.monthlyRate) : 0,
          expiry: c.expiryDate ? format(parseISO(c.expiryDate), "dd/MM/yyyy") : "",
        });
      });

      const sumRow = ws.addRow({
        no: "", accountId: "", name: "ລວມທັງໝົດ", status: "", type: "", speed: "",
        totalMonths: "", paidMonths: "",
        price: filteredTotal,
        monthly: Math.round(filteredMonthly),
        expiry: "",
      });
      sumRow.font = { bold: true };
      sumRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDECEA" } };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `revenue_all_${format(new Date(), "yyyyMMdd")}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronUp size={12} className="opacity-20" />;
    return sort.dir === "asc"
      ? <ChevronUp size={12} className="text-[hsl(0,66%,42%)]" />
      : <ChevronDown size={12} className="text-[hsl(0,66%,42%)]" />;
  };

  const activeWithRevenue = withRevenue.filter(c => c.status === "active");
  const activeSummaryTotal = activeWithRevenue.reduce((s, c) => s + c.revenue.price, 0);
  const activeSummaryMonthly = activeWithRevenue.reduce((s, c) => s + c.revenue.monthlyRate, 0);

  return (
    <div className="min-h-full bg-muted/30 pb-10">
      {/* Header */}
      <div className="bg-background border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="w-9 h-9 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center flex-shrink-0">
            <BadgeDollarSign size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base leading-tight">ລາຍຮັບຕົວຈິງ</h1>
            <p className="text-xs text-muted-foreground">ຄຳນວນຈາກລູກຄ້າ <span className="font-bold text-foreground">{fmt(summary.totalCustomers)}</span> ຄົນທັງໝົດໃນລະບົບ</p>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="ໂຫລດໃໝ່">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-6xl mx-auto">

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} /> ເກີດຂໍ້ຜິດພາດ: {error.message}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-background border border-border rounded-2xl p-4 animate-pulse h-24" />)}
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Missing Data Alert Banner ── */}
            {noRevenue.length > 0 && (
              <div className={`rounded-2xl border-2 overflow-hidden transition-all ${showMissing ? "border-amber-300" : "border-amber-200"}`}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
                  onClick={() => setShowMissing(s => !s)}>
                  <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={15} className="text-amber-700" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-bold text-amber-800 text-sm">
                      ລູກຄ້າ {noRevenue.length} ຄົນ ຂາດຂໍ້ມູນ — ບໍ່ສາມາດຄຳນວນລາຍຮັບໄດ້
                    </div>
                    <div className="text-xs text-amber-600 mt-0.5">ກົດເພື່ອ{showMissing ? "ເຊື່ອງ" : "ສະແດງ"}ລາຍຊື່ ແລະ ແກ້ໄຂ</div>
                  </div>
                  <span className="text-amber-600 flex-shrink-0">
                    {showMissing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>

                {showMissing && (
                  <div className="bg-white divide-y divide-amber-100 max-h-72 overflow-y-auto">
                    {noRevenue.map(c => {
                      const st = STATUS_CFG[c.status] ?? STATUS_CFG.inactive;
                      const StIcon = st.icon;
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-800 truncate">{c.name}</span>
                              {c.accountId && <span className="text-[10px] font-mono text-slate-400">{c.accountId}</span>}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.cls}`}>
                                <StIcon size={8} />{st.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {c.missing.map(m => (
                                <span key={m} className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                                  ✗ {m === "speed" ? "ຄວາມໄວ (ຂາດທັງ speed ແລະ package)" : m === "startDate" ? "ວັນເລີ່ມ" : "ວັນໝົດ"}
                                </span>
                              ))}
                              {(c.speed || c.packageSpeed) && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">✓ {c.speed || c.packageSpeed}</span>}
                              {c.expiryDate && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">✓ ໝົດ {format(parseISO(c.expiryDate), "dd/MM/yy")}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => setFixTarget(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[hsl(0,66%,42%)] bg-[hsl(0,66%,97%)] border-2 border-[hsl(0,66%,82%)] hover:bg-[hsl(0,66%,93%)] transition-all flex-shrink-0">
                            <Pencil size={11} /> ແກ້ໄຂ
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Banknote size={18} className="text-white" />}
                bg="bg-[hsl(0,66%,42%)]"
                label="ລາຍຮັບລວມທັງໝົດ"
                value={fmtMil(summary.total)}
                sub={`${fmt(summary.count)} / ${fmt(summary.totalCustomers)} ຄົນ`}
              />
              <KpiCard
                icon={<CheckCircle2 size={18} className="text-white" />}
                bg="bg-emerald-600"
                label="Active ລາຍຮັບ"
                value={fmtMil(activeSummaryTotal)}
                sub={`${fmt(activeWithRevenue.length)} ຄົນ active`}
              />
              <KpiCard
                icon={<Clock size={18} className="text-white" />}
                bg="bg-blue-600"
                label="ຄາດການ/ເດືອນ"
                value={fmtMil(Math.round(summary.monthlyTotal))}
                sub={`${fmt(Math.round(activeSummaryMonthly))} ₭ (active)`}
              />
              <KpiCard
                icon={<TrendingUp size={18} className="text-white" />}
                bg="bg-violet-600"
                label="ຄາດການ/ປີ"
                value={fmtMil(summary.projectedAnnual)}
                sub={`ສະເລ່ຍ ${fmtMil(summary.avgPerCustomer)}/ລູກຄ້າ`}
              />
            </div>

            {/* ── Status breakdown mini cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["active","inactive","suspended","expired"].map(s => {
                const st = STATUS_CFG[s];
                const StIcon = st.icon;
                const data = summary.byStatus[s] ?? { count: 0, revenue: 0 };
                return (
                  <div key={s} className={`bg-white rounded-xl border-2 p-3 ${st.cls} border-opacity-60`}
                    style={{ borderColor: s === "active" ? "#bbf7d0" : s === "expired" ? "#fecaca" : s === "suspended" ? "#fde68a" : "#e2e8f0" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <StIcon size={12} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">{st.label}</span>
                    </div>
                    <div className="text-xl font-extrabold">{fmt(data.count)} <span className="text-sm font-semibold opacity-60">ຄົນ</span></div>
                    {data.revenue > 0 && <div className="text-xs font-semibold opacity-75 mt-0.5">{fmtMil(data.revenue)} ₭</div>}
                  </div>
                );
              })}
            </div>

            {/* ── Pivot Table: All Customers Speed × Duration ── */}
            {activeSpeedRows.length > 0 && (
              <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2 flex-wrap">
                  <BarChart2 size={16} className="text-[hsl(0,66%,42%)]" />
                  <span className="font-bold text-foreground">ສະຫຼຸບລູກຄ້າທັງໝົດ: ຄວາມໄວ × ໄລຍະສັນຍາ</span>
                  <span className="ml-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">ບໍ່ລວມແຈ້ງປັນຫາ</span>
                  <span className="ml-auto text-xs text-muted-foreground italic">ຈຳນວນຄົນ / ລາຍຮັບລວມ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[hsl(0,66%,42%)] text-white">
                        <th className="px-4 py-3 text-left font-bold whitespace-nowrap">ຄວາມໄວ</th>
                        {PAID_MONTHS.map(m => (
                          <th key={m} className="px-3 py-3 text-center font-bold min-w-[120px]">
                            <div>{PAID_LABEL_SHORT[m]}</div>
                            <div className="text-[10px] font-normal opacity-70 mt-0.5">{PAID_BONUS[m]}</div>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center font-bold min-w-[120px] bg-[hsl(0,66%,33%)]">ລວມ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSpeedRows.map((speed, idx) => {
                        const rowData = bySpeedDuration[speed] ?? {};
                        const rowCount = PAID_MONTHS.reduce((s, m) => s + (rowData[m]?.count ?? 0), 0);
                        const rowTotal = PAID_MONTHS.reduce((s, m) => s + (rowData[m]?.total ?? 0), 0);
                        return (
                          <tr key={speed} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                            <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{speed}</td>
                            {PAID_MONTHS.map(m => {
                              const cell = rowData[m];
                              return (
                                <td key={m} className="px-3 py-2.5 text-center border-l border-border/30">
                                  {cell ? (
                                    <>
                                      <div className="inline-flex items-center gap-1 justify-center">
                                        <span className="font-bold text-foreground text-sm">{cell.count}</span>
                                        <span className="text-muted-foreground text-[10px]">ຄົນ</span>
                                      </div>
                                      <div className="text-[hsl(0,66%,42%)] font-semibold mt-0.5">{fmtM(cell.total)}</div>
                                    </>
                                  ) : <span className="text-muted-foreground/30">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5 text-center border-l-2 border-[hsl(0,66%,42%)]/20 bg-[hsl(0,66%,42%)]/5">
                              <div className="inline-flex items-center gap-1 justify-center">
                                <span className="font-extrabold text-foreground text-sm">{rowCount}</span>
                                <span className="text-muted-foreground text-[10px]">ຄົນ</span>
                              </div>
                              <div className="text-[hsl(0,66%,42%)] font-bold mt-0.5">{fmtM(rowTotal)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[hsl(0,66%,42%)]/8 border-t-2 border-[hsl(0,66%,42%)]/30">
                        <td className="px-4 py-3 font-bold text-foreground text-sm">ລວມ</td>
                        {PAID_MONTHS.map(m => (
                          <td key={m} className="px-3 py-3 text-center border-l border-border/30">
                            {colTotals[m]?.count > 0 ? (
                              <>
                                <div className="inline-flex items-center gap-1 justify-center">
                                  <span className="font-bold text-foreground">{colTotals[m].count}</span>
                                  <span className="text-muted-foreground text-[10px]">ຄົນ</span>
                                </div>
                                <div className="text-[hsl(0,66%,42%)] font-bold mt-0.5">{fmtM(colTotals[m].total)}</div>
                              </>
                            ) : <span className="text-muted-foreground/30">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center border-l-2 border-[hsl(0,66%,42%)]/30 bg-[hsl(0,66%,42%)]/10">
                          <div className="inline-flex items-center gap-1 justify-center">
                            <span className="font-extrabold text-foreground text-base">{withRevenue.length}</span>
                            <span className="text-muted-foreground text-[11px]">ຄົນ</span>
                          </div>
                          <div className="text-[hsl(0,66%,42%)] font-extrabold mt-0.5 text-sm">{fmtM(summary.total)}</div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ── Charts Row ── */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi size={14} className="text-[hsl(0,66%,42%)]" />
                  <span className="text-sm font-bold text-foreground">ລາຍຮັບຕາມຄວາມໄວ</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bySpeed} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,90%)" />
                    <XAxis dataKey="speed" tick={{ fontSize: 9, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => v.replace(" Mbps", "")} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => (v/1_000_000).toFixed(0) + "M"} />
                    <Tooltip formatter={(v, n) => [fmtM(v), n === "total" ? "ລາຍຮັບລວມ" : "ລາຄາ/ເດືອນ"]} labelFormatter={l => l + " Mbps"} contentStyle={{ borderRadius: 10, border: "1px solid hsl(0,0%,88%)", fontSize: 11 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {bySpeed.map((_, i) => <Cell key={i} fill={`hsl(0,${66 - i * 2}%,${42 + i * 3}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-background border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={14} className="text-blue-600" />
                  <span className="text-sm font-bold text-foreground">ລາຍຮັບຕາມໄລຍະ</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byDuration} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,90%)" />
                    <XAxis dataKey="paidMonths" tick={{ fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={v => v + " ເດືອນ"} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => (v/1_000_000).toFixed(0) + "M"} />
                    <Tooltip formatter={(v) => [fmtM(v), "ລາຍຮັບລວມ"]} labelFormatter={l => "ຈ່າຍ " + l + " ເດືອນ"} contentStyle={{ borderRadius: 10, border: "1px solid hsl(0,0%,88%)", fontSize: 11 }} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {byDuration.map((d, i) => {
                        const cols = ["#3b82f6","#8b5cf6","#f59e0b","#10b981"];
                        return <Cell key={i} fill={cols[i % cols.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Speed + Type ── */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Wifi size={13} className="text-[hsl(0,66%,42%)]" />
                  <span className="text-sm font-bold text-foreground">ສະຫຼຸບຕາມຄວາມໄວ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-semibold">ຄວາມໄວ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ຜູ້ໃຊ້</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ລາຍຮັບລວມ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ລາຄາ/ເດືອນ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bySpeed.map((row, i) => (
                        <tr key={row.speed} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-4 py-2.5 font-bold text-foreground">{row.speed}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(row.count)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-[hsl(0,66%,42%)]">{fmtM(row.total)}</td>
                          <td className="px-3 py-2.5 text-right text-blue-600">{fmtM(Math.round(row.monthly))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[hsl(0,66%,42%)]/5 border-t-2 border-[hsl(0,66%,42%)]/20">
                        <td className="px-4 py-2.5 font-bold text-foreground">ລວມ</td>
                        <td className="px-3 py-2.5 text-right font-bold">{fmt(summary.count)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-[hsl(0,66%,42%)]">{fmtM(summary.total)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-600">{fmtM(Math.round(summary.monthlyTotal))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-background border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <CalendarDays size={13} className="text-blue-600" />
                    <span className="text-sm font-bold text-foreground">ສະຫຼຸບຕາມໄລຍະ</span>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-semibold">ໄລຍະ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ຜູ້ໃຊ້</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ລາຍຮັບ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDuration.map((row, i) => (
                        <tr key={row.totalMonths} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-4 py-2.5 font-semibold text-foreground">{DURATION_LABEL[row.totalMonths]}</td>
                          <td className="px-3 py-2.5 text-right">{fmt(row.count)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">{fmtM(row.total)}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            {summary.total ? Math.round(row.total / summary.total * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
                <div className="bg-background border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Users size={13} className="text-violet-600" />
                    <span className="text-sm font-bold text-foreground">ສະຫຼຸບຕາມປະເພດ</span>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                        <th className="px-4 py-2.5 text-left font-semibold">ປະເພດ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ຜູ້ໃຊ້</th>
                        <th className="px-3 py-2.5 text-right font-semibold">ລາຍຮັບ</th>
                        <th className="px-3 py-2.5 text-right font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byType.map((row, i) => {
                        const t = TYPE_MAP[row.code];
                        return (
                          <tr key={row.code} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="px-4 py-2.5 font-semibold text-foreground">{t?.emoji} {t?.label ?? row.code}</td>
                            <td className="px-3 py-2.5 text-right">{fmt(row.count)}</td>
                            <td className="px-3 py-2.5 text-right text-violet-600 font-semibold">{fmtM(row.total)}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                              {summary.total ? Math.round(row.total / summary.total * 100) : 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Customer Detail Table ── */}
            <div className="bg-background border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="text-[hsl(0,66%,42%)]" />
                    <span className="text-sm font-bold text-foreground">ລາຍລະອຽດຕໍ່ລູກຄ້າ</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-semibold">
                      {fmt(filteredCustomers.length)} ຄົນ
                    </span>
                  </div>
                  <button onClick={exportExcel} disabled={exporting}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                    <Download size={12} />
                    {exporting ? "ກຳລັງສົ່ງອອກ..." : "Excel"}
                  </button>
                </div>

                {/* Status tabs */}
                <div className="flex gap-1 flex-wrap">
                  {[
                    { key: "all", label: `ທັງໝົດ (${fmt(withRevenue.length)})` },
                    { key: "active", label: `Active (${fmt(activeWithRevenue.length)})` },
                    { key: "expired", label: `ໝົດ (${fmt(summary.byStatus.expired?.count ?? 0)})` },
                    { key: "suspended", label: `ລະງັບ (${fmt(summary.byStatus.suspended?.count ?? 0)})` },
                    { key: "inactive", label: `ບໍ່ active (${fmt(summary.byStatus.inactive?.count ?? 0)})` },
                    { key: "missing", label: `ຂາດຂໍ້ມູນ (${fmt(noRevenue.length)})`, warn: noRevenue.length > 0 },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setStatusTab(tab.key)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border
                        ${statusTab === tab.key
                          ? tab.warn ? "bg-amber-500 text-white border-amber-500" : "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]"
                          : tab.warn && noRevenue.length > 0 ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                          : "text-slate-600 bg-white border-slate-200 hover:bg-muted/50"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filters (hide for missing tab) */}
                {statusTab !== "missing" && (
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ຄົ້ນຫາຊື່, Account ID..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-muted/30 focus:outline-none focus:border-[hsl(0,66%,42%)]" />
                    </div>
                    <select value={speedFilter} onChange={e => setSpeedFilter(e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]">
                      <option value="all">ທຸກຄວາມໄວ</option>
                      {SPEED_ORDER.filter(s => bySpeed.find(b => b.speed === s)).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={durationFilter} onChange={e => setDurationFilter(e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]">
                      <option value="all">ທຸກໄລຍະ</option>
                      {STANDARD_MONTHS.filter(m => byDuration.find(d => d.totalMonths === m)).map(m => (
                        <option key={m} value={m}>{PAID_LABEL[TOTAL_TO_PAID[m]]}</option>
                      ))}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]">
                      <option value="all">ທຸກປະເພດ</option>
                      {byType.map(t => <option key={t.code} value={t.code}>{TYPE_MAP[t.code]?.emoji} {TYPE_MAP[t.code]?.label ?? t.code}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left font-semibold w-6">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold">
                        <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">ຊື່ <SortIcon field="name" /></button>
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold">ສະຖານະ</th>
                      <th className="px-3 py-2.5 text-left font-semibold">
                        <button onClick={() => toggleSort("speed")} className="flex items-center gap-1 hover:text-foreground">ຄວາມໄວ <SortIcon field="speed" /></button>
                      </th>
                      {statusTab !== "missing" && (
                        <>
                          <th className="px-3 py-2.5 text-center font-semibold">ໄລຍະ</th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            <button onClick={() => toggleSort("price")} className="flex items-center gap-1 ml-auto hover:text-foreground">ລາຄາທີ່ຈ່າຍ <SortIcon field="price" /></button>
                          </th>
                          <th className="px-3 py-2.5 text-right font-semibold">
                            <button onClick={() => toggleSort("monthlyRate")} className="flex items-center gap-1 ml-auto hover:text-foreground">ລາຄາ/ເດືອນ <SortIcon field="monthlyRate" /></button>
                          </th>
                          <th className="px-3 py-2.5 text-center font-semibold">
                            <button onClick={() => toggleSort("expiryDate")} className="flex items-center gap-1 mx-auto hover:text-foreground">ໝົດສັນຍາ <SortIcon field="expiryDate" /></button>
                          </th>
                        </>
                      )}
                      {statusTab === "missing" && <th className="px-3 py-2.5 text-left font-semibold">ຂໍ້ມູນທີ່ຂາດ</th>}
                      <th className="px-3 py-2.5 text-center font-semibold">ແກ້ໄຂ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                          <Search size={28} className="mx-auto mb-2 opacity-30" />
                          ບໍ່ພົບລູກຄ້າ
                        </td>
                      </tr>
                    ) : pageItems.map((c, i) => {
                      const t = TYPE_MAP[c.customerType ?? "IN"];
                      const st = STATUS_CFG[c.status] ?? STATUS_CFG.inactive;
                      const StIcon = st.icon;
                      const today = new Date().toISOString().slice(0, 10);
                      const expiring = c.expiryDate && c.expiryDate <= new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
                      const rowNum = (safeDetailPage - 1) * DETAIL_PAGE_SIZE + i + 1;
                      return (
                        <tr key={c.id} className={i % 2 === 0 ? "bg-background hover:bg-muted/20" : "bg-muted/10 hover:bg-muted/30"}>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono">{rowNum}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {c.vip && <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                              <span className="font-semibold text-foreground leading-tight">{c.name}</span>
                            </div>
                            {c.accountId && <div className="text-muted-foreground font-mono text-[10px]">{c.accountId}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.cls}`}>
                              <StIcon size={8} />{st.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {c.revenue?.usedSpeed
                              ? <>
                                  <span className="font-bold text-[hsl(0,66%,42%)]">{c.revenue.usedSpeed}</span>
                                  {!c.speed && c.packageSpeed && (
                                    <span className="ml-1 text-[9px] text-muted-foreground bg-muted px-1 rounded">{c.packageName ?? "Package"}</span>
                                  )}
                                </>
                              : <span className="text-red-400 font-bold text-[10px]">ຂາດ</span>}
                          </td>
                          {statusTab !== "missing" && (
                            <>
                              <td className="px-3 py-2.5 text-center text-muted-foreground">
                                {c.revenue ? PAID_LABEL[c.revenue.paidMonths] : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {c.revenue ? <span className="font-bold text-foreground">{fmtM(c.revenue.price)}</span> : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right text-blue-600 font-semibold">
                                {c.revenue ? fmtM(Math.round(c.revenue.monthlyRate)) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {c.expiryDate ? (
                                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${expiring ? "bg-amber-100 text-amber-700 font-semibold" : "text-muted-foreground"}`}>
                                    {format(parseISO(c.expiryDate), "dd/MM/yy")}
                                  </span>
                                ) : <span className="text-red-400 text-[10px] font-bold">ຂາດ</span>}
                              </td>
                            </>
                          )}
                          {statusTab === "missing" && (
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1 flex-wrap">
                                {c.missing.map(m => (
                                  <span key={m} className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                                    ✗ {m === "speed" ? "ຄວາມໄວ" : m === "startDate" ? "ວັນເລີ່ມ" : "ວັນໝົດ"}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-center">
                            <button onClick={() => setFixTarget(c)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
                              <Pencil size={10} /> ແກ້
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {statusTab !== "missing" && filteredCustomers.length > 0 && (
                    <tfoot>
                      <tr className="bg-[hsl(0,66%,42%)]/8 border-t-2 border-[hsl(0,66%,42%)]/25">
                        <td colSpan={5} className="px-4 py-3 font-bold text-foreground text-xs">
                          ລວມ {fmt(filteredCustomers.length)} ຄົນ
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-[hsl(0,66%,42%)] text-sm">{fmtM(filteredTotal)}</td>
                        <td className="px-3 py-3 text-right font-bold text-blue-600 text-sm">{fmtM(Math.round(filteredMonthly))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* ─── Pagination Controls ─── */}
              {totalDetailPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    ສະແດງ {fmt((safeDetailPage - 1) * DETAIL_PAGE_SIZE + 1)}–{fmt(Math.min(safeDetailPage * DETAIL_PAGE_SIZE, filteredCustomers.length))} ຈາກ {fmt(filteredCustomers.length)} ຄົນ
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailPage(1)}
                      disabled={safeDetailPage === 1}
                      className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >«</button>
                    <button
                      onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                      disabled={safeDetailPage === 1}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    ><ChevronLeft size={13} /></button>
                    {Array.from({ length: totalDetailPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalDetailPages || Math.abs(p - safeDetailPage) <= 2)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "…" ? (
                          <span key={`e${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setDetailPage(p)}
                            className={`min-w-[28px] px-2 py-1 rounded-lg text-xs font-bold border transition-colors
                              ${safeDetailPage === p
                                ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]"
                                : "border-border bg-background hover:bg-muted text-foreground"}`}
                          >{p}</button>
                        )
                      )}
                    <button
                      onClick={() => setDetailPage(p => Math.min(totalDetailPages, p + 1))}
                      disabled={safeDetailPage === totalDetailPages}
                      className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    ><ChevronRight size={13} /></button>
                    <button
                      onClick={() => setDetailPage(totalDetailPages)}
                      disabled={safeDetailPage === totalDetailPages}
                      className="px-2 py-1 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >»</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Fix Modal */}
      {fixTarget && (
        <QuickFixModal
          customer={fixTarget}
          onClose={() => setFixTarget(null)}
          onSave={handleQuickFix}
        />
      )}
    </div>
  );
}

function KpiCard({ icon, bg, label, value, sub }) {
  return (
    <div className="bg-background border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight mb-0.5">{label}</div>
        <div className="text-xl font-bold text-foreground leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{sub}</div>
      </div>
    </div>
  );
}
