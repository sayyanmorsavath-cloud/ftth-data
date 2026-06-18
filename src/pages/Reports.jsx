import {
  useGetDashboardSummary,
  useGetCustomersByPackage,
  useListCustomers,
  useGetExpiringSoon,
  getCustomersBySpeed,
  useListTickets,
} from "@/lib/store";
import { PRICE_TABLE, TOTAL_TO_PAID } from "@/lib/pricing";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import {
  BarChart2, TrendingUp, Users, Wifi,
  AlertTriangle, UserX, Clock, Building2,
  CalendarDays, CheckCircle2, XCircle, Star,
  FileSpreadsheet, Activity, Zap,
  DollarSign, AlertCircle, TicketCheck,
  Wrench, HelpCircle, RefreshCw, PhoneCall,
  Search, List, ChevronDown, ChevronUp, Camera, LayoutDashboard,
} from "lucide-react";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";
import { differenceInDays, format, parseISO, subMonths } from "date-fns";
import { DateInput } from "@/components/DateInput";
import { useLocation } from "wouter";

// ─── Constants ────────────────────────────────────────────────────────────────
const RED = "hsl(0,66%,42%)";
const REDS = [RED, "hsl(0,60%,55%)", "hsl(0,50%,68%)", "hsl(0,40%,78%)", "hsl(0,30%,86%)"];
const SPEED_COLORS = [
  "hsl(220,75%,52%)", "hsl(260,65%,55%)", "hsl(190,70%,45%)",
  "hsl(160,60%,42%)", "hsl(35,85%,50%)", "hsl(300,55%,52%)", "hsl(0,65%,50%)",
];
const FONT = { fontFamily: "'Noto Sans Lao', sans-serif", fontSize: 11 };

const TICKET_STATUS_META = {
  open:        { label: "Queued",      cls: "bg-blue-100 text-blue-700",      dot: "bg-blue-500",    color: "hsl(220,75%,55%)" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700",    dot: "bg-amber-500",   color: "hsl(40,90%,52%)" },
  pending:     { label: "Pending",     cls: "bg-purple-100 text-purple-700",  dot: "bg-purple-500",  color: "hsl(270,60%,55%)" },
  resolved:    { label: "Resolved",    cls: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500", color: "hsl(160,60%,45%)" },
  closed:      { label: "Closed",      cls: "bg-muted text-muted-foreground", dot: "bg-slate-400",   color: "hsl(220,10%,65%)" },
};

const PRIORITIES_META = {
  urgent: { label: "ດ່ວນ",    color: "hsl(0,72%,51%)",  bg: "bg-red-100 text-red-700" },
  high:   { label: "ສູງ",     color: "hsl(25,90%,52%)", bg: "bg-orange-100 text-orange-700" },
  normal: { label: "ປົກກະຕິ", color: "hsl(220,75%,55%)",bg: "bg-blue-100 text-blue-700" },
  low:    { label: "ຕ່ຳ",     color: "hsl(220,10%,65%)",bg: "bg-muted text-muted-foreground" },
};

const CATEGORIES_META = [
  { value: "ອິນເຕີເນັດຊ້າ",   icon: Zap,         color: "hsl(40,90%,52%)" },
  { value: "ອິນເຕີເນັດຂາດ",   icon: Wifi,        color: "hsl(0,72%,51%)" },
  { value: "ອຸປະກອນຂັດຂ້ອງ", icon: Wrench,      color: "hsl(25,90%,52%)" },
  { value: "ຂໍຕໍ່ອາຍຸ",       icon: RefreshCw,   color: "hsl(220,75%,55%)" },
  { value: "ອື່ນໆ",            icon: HelpCircle,  color: "hsl(220,10%,65%)" },
];

const FOLLOW_STEPS_META = [
  { value: "ຕ້ອງຕິດຕາມ",   label: "ຕ້ອງຕິດຕາມ",   color: "bg-red-500",    text: "text-red-600",    bg: "bg-red-50 border-red-200",     chartColor: "hsl(0,72%,51%)" },
  { value: "ກຳລັງຕິດຕາມ", label: "ກຳລັງຕິດຕາມ", color: "bg-amber-400",  text: "text-amber-600",  bg: "bg-amber-50 border-amber-200", chartColor: "hsl(40,90%,52%)" },
  { value: "ຕິດຕາມແລ້ວ",   label: "ຕິດຕາມແລ້ວ",   color: "bg-blue-400",   text: "text-blue-600",   bg: "bg-blue-50 border-blue-200",   chartColor: "hsl(220,75%,55%)" },
  { value: "ສຳເລັດ",       label: "ສຳເລັດ",         color: "bg-emerald-500",text: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200", chartColor: "hsl(160,60%,45%)" },
];

const PERIOD_META = [
  { key: "expiring",  label: "ໃກ້ໝົດ (≤7ວ)",  color: "hsl(40,90%,52%)",  bg: "bg-amber-50" },
  { key: "expired_1", label: "ໝົດ ≤6 ເດືອນ",   color: "hsl(25,90%,52%)",  bg: "bg-orange-50" },
  { key: "expired_2", label: "ໝົດ 6–12 ເດືອນ", color: "hsl(0,65%,52%)",   bg: "bg-red-50" },
  { key: "expired_3", label: "ໝົດ 12+ ເດືອນ",  color: "hsl(0,55%,38%)",   bg: "bg-red-100" },
];

// ─── Export ───────────────────────────────────────────────────────────────────
async function exportFullReport({ summary, byPackage, expiringSoon, bySpeed, tickets, customers }) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LTC FTTH Tracker";
  wb.created = new Date();
  const now = new Date();

  const RED_FILL  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC62828" } };
  const BLUE_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1565C0" } };
  const GREEN_FILL= { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
  const AMBER_FILL= { type: "pattern", pattern: "solid", fgColor: { argb: "FFF57F17" } };
  const WF = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };

  function hdr(row, fill) {
    row.eachCell(c => { c.font = WF; c.fill = fill; c.alignment = { horizontal: "center", vertical: "middle" }; });
    row.height = 22;
  }
  function autoW(ws) {
    ws.columns?.forEach(col => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, c => { const l = String(c.value ?? "").length; if (l > max) max = l; });
      col.width = Math.min(max + 2, 42);
    });
  }

  // Sheet 1: KPI
  const ws1 = wb.addWorksheet("ສະຫຼຸບ KPI");
  ws1.addRow(["ລາຍງານ LTC FTTH Tracker"]).font = { bold: true, size: 14, color: { argb: "FFC62828" } };
  ws1.addRow([`ວັນທີ: ${format(now, "dd/MM/yyyy HH:mm")}`]);
  ws1.addRow([]);
  hdr(ws1.addRow(["ຕົວຊີ້ວັດ", "ຄ່າ"]), RED_FILL);
  [
    ["ລູກຄ້າທັງໝົດ", summary?.totalCustomers ?? 0],
    ["ລູກຄ້າໃຊ້ງານ (active)", summary?.activeCustomers ?? 0],
    ["ລູກຄ້າ VIP", summary?.vipCustomers ?? 0],
    ["ໃກ້ໝົດອາຍຸ (≤30ວ)", summary?.expiringSoon ?? 0],
    ["ໝົດອາຍຸທັງໝົດ", summary?.expiredCustomers ?? 0],
    ["ໝົດ ≤6 ເດືອນ", summary?.expiredPeriod1 ?? 0],
    ["ໝົດ 6–12 ເດືອນ", summary?.expiredPeriod2 ?? 0],
    ["ໝົດ 12+ ເດືອນ", summary?.expiredPeriod3 ?? 0],
    ["ລາຍຮັບລວມ (ກີບ)", summary?.totalMonthlyRevenue ?? 0],
    ["ແພັກເກດທັງໝົດ", summary?.totalPackages ?? 0],
    ["Ticketທັງໝົດ", tickets?.length ?? 0],
    ["Ticket Queued", tickets?.filter(t => t.status === "open").length ?? 0],
    ["Ticket ດ່ວນ", tickets?.filter(t => t.priority === "urgent").length ?? 0],
  ].forEach(r => ws1.addRow(r));
  autoW(ws1);

  // Sheet 2: Tickets
  const ws2 = wb.addWorksheet("ແຈ້ງບັນຫາ (Tickets)");
  hdr(ws2.addRow(["ວັນທີ່ແຈ້ງ", "ຊື່ລູກຄ້າ", "ເບີໂທ", "ເບີຕິດຕັດ", "ທີ່ຢູ່", "ລາຍລະອຽດ ບັນຫາ", "ວັນທີ່ແຈ້ງທີມ", "ສະຖານະ"]), RED_FILL);
  (tickets ?? []).forEach((t) => {
    ws2.addRow([
      t.reportedAt ? format(parseISO(t.reportedAt), "dd/MM/yyyy HH:mm") : "—",
      t.customerName ?? "—",
      t.customerPhone ?? "—",
      t.customerAccountId ?? "—",
      t.customerAddress ?? "—",
      t.description ?? "—",
      t.dispatchedAt ? format(parseISO(t.dispatchedAt), "dd/MM/yyyy HH:mm") : "—",
      TICKET_STATUS_META[t.status]?.label ?? t.status ?? "—",
    ]);
  });
  autoW(ws2);

  // Sheet 3: Tracking summary
  const ws3 = wb.addWorksheet("ການຕິດຕາມ");
  hdr(ws3.addRow(["ສະຖານະຕິດຕາມ", "ຈຳນວນ (ຄົນ)"]), AMBER_FILL);
  FOLLOW_STEPS_META.forEach(s => {
    const count = summary?.[`follow${s.value === "ຕ້ອງຕິດຕາມ" ? "NeedAction" : s.value === "ກຳລັງຕິດຕາມ" ? "InProgress" : s.value === "ຕິດຕາມແລ້ວ" ? "Done" : "Completed"}`] ?? 0;
    ws3.addRow([s.label, count]);
  });
  ws3.addRow([]);
  hdr(ws3.addRow(["ລູກຄ້າ", "ເບີໂທ", "ວັນໝົດ", "ສະຖານະຕິດຕາມ", "ຜູ້ຕິດຕາມ", "ໝາຍເຫດ"]), AMBER_FILL);
  (customers ?? []).filter(c => c.followUpStatus).forEach(c => {
    ws3.addRow([c.name, c.phone, c.expiryDate, c.followUpStatus, c.followUpPerson ?? "—", c.remarks ?? "—"]);
  });
  autoW(ws3);

  // Sheet 4: Package
  const ws4 = wb.addWorksheet("ລູກຄ້າຕາມແພັກເກດ");
  hdr(ws4.addRow(["#", "ແພັກເກດ", "ຄວາມໄວ", "ລູກຄ້າ", "ລາຍຮັບ (ກີບ)"]), BLUE_FILL);
  (byPackage ?? []).forEach((p, i) => ws4.addRow([i + 1, p.packageName, p.speed, p.customerCount, p.revenue]));
  const totPR = ws4.addRow(["", "ລວມ", "", (byPackage ?? []).reduce((s, p) => s + p.customerCount, 0), (byPackage ?? []).reduce((s, p) => s + p.revenue, 0)]);
  totPR.font = { bold: true };
  autoW(ws4);

  // Sheet 5: Customer Type
  const ws5 = wb.addWorksheet("ປະເພດລູກຄ້າ");
  hdr(ws5.addRow(["ລະຫັດ", "ປະເພດ", "ຈຳນວນ (ຄົນ)", "ສ່ວນແບ່ງ (%)"]), GREEN_FILL);
  const tot = summary?.totalCustomers || 1;
  CUSTOMER_TYPES.forEach(t => {
    const v = summary?.[`type_${t.code}`] ?? 0;
    ws5.addRow([t.code, t.label, v, tot > 0 ? Math.round((v / tot) * 100) : 0]);
  });
  autoW(ws5);

  // Sheet 6: Speed
  const ws6 = wb.addWorksheet("ຄວາມໄວ");
  hdr(ws6.addRow(["ຄວາມໄວ", "ຈຳນວນ", "ສ່ວນແບ່ງ (%)"]), RED_FILL);
  (bySpeed ?? []).forEach(r => ws6.addRow([r.speed, r.customerCount, r.pct]));
  autoW(ws6);

  // Sheet 7: Expiring soon
  const ws7 = wb.addWorksheet("ໃກ້ໝົດອາຍຸ");
  hdr(ws7.addRow(["ຊື່", "ເບີໂທ", "ທີ່ຢູ່", "ແພັກເກດ", "ວັນໝົດ", "ເຫຼືອ (ວ)"]), RED_FILL);
  (expiringSoon ?? []).forEach(c => {
    const days = differenceInDays(parseISO(c.expiryDate), new Date());
    ws7.addRow([c.name, c.phone, c.address ?? "", c.packageName ?? "", c.expiryDate, days]);
  });
  autoW(ws7);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FTTH-ລາຍງານ-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-3 py-2.5 text-xs min-w-[130px]" style={FONT}>
      {label && <p className="font-semibold text-foreground mb-1.5 border-b border-border pb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.color || p.stroke }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{typeof p.value === "number" && p.value > 10000 ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, icon: Icon, colorClass, border, badge }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-4 flex items-start gap-3 border-l-4 ${border}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {badge && <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.text}</span>}
    </div>
  );
}

function SectionDivider({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-9 h-9 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-sm">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-extrabold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(0,66%,42%)]/10 flex items-center justify-center">
          <Icon size={15} className="text-[hsl(0,66%,42%)]" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-sm">{title}</h3>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text = "ຍັງບໍ່ມີຂໍ້ມູນ" }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <BarChart2 size={28} className="opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Circle stat component (ຍ້າຍຈາກ Dashboard) ───────────────────────────────
function CircleStat({ label, pct, color, icon: Icon }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(0,0%,93%)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-sm font-bold text-foreground">{Math.round(pct)}%</div>
      <div className="text-[11px] font-medium tracking-tight text-muted-foreground text-center leading-tight">{label}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [, setLocation] = useLocation();
  const { data: summary } = useGetDashboardSummary();
  const { data: byPackage } = useGetCustomersByPackage();
  const { data: _custPage } = useListCustomers({ pageSize: 10000 });
  const customers = _custPage?.data ?? [];
  const { data: expiringSoon } = useGetExpiringSoon();
  const { data: tickets } = useListTickets();
  const { data: bySpeed } = useQuery({
    queryKey: ["stats/by-speed"],
    queryFn: () => getCustomersBySpeed(),
    staleTime: 30_000,
  });

  const now = new Date();
  const total = summary?.totalCustomers ?? 0;
  const active = summary?.activeCustomers ?? 0;
  const activeRate = total ? Math.round((active / total) * 100) : 0;
  const vipPct   = total ? Math.round(((summary?.vipCustomers ?? 0) / total) * 100) : 0;
  const revenue  = summary?.totalMonthlyRevenue ?? 0;
  const totalExpired = summary?.expiredCustomers ?? 0;

  // ── Ticket stats ──
  const ticketList = tickets ?? [];
  const tOpen       = ticketList.filter(t => t.status === "open").length;
  const tInProgress = ticketList.filter(t => t.status === "in_progress").length;
  const tResolved   = ticketList.filter(t => t.status === "resolved").length;
  const tClosed     = ticketList.filter(t => t.status === "closed").length;
  const tUrgent     = ticketList.filter(t => t.priority === "urgent").length;
  const tHigh       = ticketList.filter(t => t.priority === "high").length;

  const ticketStatusData = Object.entries(TICKET_STATUS_META).map(([key, meta]) => ({
    name: meta.label,
    value: ticketList.filter(t => t.status === key).length,
    color: meta.color,
  })).filter(d => d.value > 0);

  const ticketCategoryData = CATEGORIES_META.map(cat => ({
    name: cat.value,
    value: ticketList.filter(t => t.category === cat.value).length,
    color: cat.color,
  })).filter(d => d.value > 0);

  const ticketPriorityData = Object.entries(PRIORITIES_META).map(([key, meta]) => ({
    name: meta.label,
    value: ticketList.filter(t => t.priority === key).length,
    color: meta.color,
  })).filter(d => d.value > 0);

  const recentOpenTickets = ticketList
    .filter(t => t.status === "open" || t.status === "in_progress")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  // ── Tracking stats ──
  const followSteps = FOLLOW_STEPS_META.map(s => {
    const key = s.value === "ຕ້ອງຕິດຕາມ" ? "followNeedAction"
              : s.value === "ກຳລັງຕິດຕາມ" ? "followInProgress"
              : s.value === "ຕິດຕາມແລ້ວ"   ? "followDone"
              : "followCompleted";
    return { ...s, count: summary?.[key] ?? 0 };
  });
  const needFollow = followSteps.reduce((a, b) => a + b.count, 0);
  const followed   = (summary?.followDone ?? 0) + (summary?.followCompleted ?? 0);
  const followPct  = needFollow > 0 ? Math.round((followed / needFollow) * 100) : 0;

  // Period breakdown with follow-up status cross-tab
  const ago6m  = subMonths(now, 6).toISOString().slice(0, 10);
  const ago12m = subMonths(now, 12).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  const in7dStr  = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  function periodCustomers(key) {
    return customers.filter(c => {
      const exp = c.expiryDate;
      if (key === "expiring")  return exp >= todayStr && exp <= in7dStr;
      if (key === "expired_1") return exp >= ago6m && exp < todayStr;
      if (key === "expired_2") return exp >= ago12m && exp < ago6m;
      if (key === "expired_3") return exp < ago12m;
      return true;
    });
  }

  const periodData = PERIOD_META.map(p => {
    const list = periodCustomers(p.key);
    return {
      ...p,
      total: list.length,
      byFollow: FOLLOW_STEPS_META.map(s => ({
        label: s.label,
        count: list.filter(c => c.followUpStatus === s.value).length,
        color: s.chartColor,
      })),
    };
  });

  const periodChartData = PERIOD_META.map(p => {
    const obj = { name: p.label };
    FOLLOW_STEPS_META.forEach(s => {
      obj[s.label] = periodCustomers(p.key).filter(c => c.followUpStatus === s.value).length;
    });
    return obj;
  });

  // ── Customer / chart data ──
  const statusData = [
    { name: "ໃຊ້ງານ",    value: summary?.activeCustomers ?? 0,    color: "hsl(160,60%,45%)" },
    { name: "ບໍ່ໃຊ້ງານ", value: summary?.inactiveCustomers ?? 0,  color: "hsl(220,10%,60%)" },
    { name: "ຖືກລະງັບ",  value: summary?.suspendedCustomers ?? 0, color: "hsl(40,90%,52%)" },
    { name: "ໝົດອາຍຸ",   value: summary?.expiredCustomers ?? 0,   color: RED },
  ].filter(d => d.value > 0);

  const typeData = CUSTOMER_TYPES
    .map(t => ({ ...t, name: `${t.emoji} ${t.code}`, value: summary?.[`type_${t.code}`] ?? 0 }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const expiryByWeek = [0, 1, 2, 3].map(w => {
    const start = w * 7, end = start + 7;
    const count = customers.filter(c => {
      const d = differenceInDays(parseISO(c.expiryDate), now);
      return d >= start && d < end;
    }).length;
    return { name: `ອາທິດ ${w + 1}`, ໝົດ: count };
  });

  const speedData = (bySpeed ?? [])
    .filter(r => r.customerCount > 0 && r.speed)
    .map((r, i) => ({ ...r, color: SPEED_COLORS[i % SPEED_COLORS.length] }));

  // ─── Compute accurate revenue directly from customer records ─────────────────
  // Uses actual speed + subscription period (startDate → expiryDate) per customer
  const accurateRevenuePkgRows = useMemo(() => {
    if (!customers.length) return [];
    const speedMap = {};
    for (const c of customers) {
      if (!c.speed) continue;
      if (!speedMap[c.speed]) {
        speedMap[c.speed] = { speed: c.speed, customerCount: 0, activeCount: 0, revenue: 0 };
      }
      speedMap[c.speed].customerCount += 1;
      if (c.status !== "active") continue;
      speedMap[c.speed].activeCount += 1;

      // Determine monthly revenue: use actual subscription duration if available
      let monthlyRev = PRICE_TABLE[c.speed]?.[1] ?? 0;
      if (c.startDate && c.expiryDate) {
        try {
          const totalMonths = Math.round(
            differenceInDays(parseISO(c.expiryDate), parseISO(c.startDate)) / 30
          );
          const paidMonths = TOTAL_TO_PAID[totalMonths];
          if (paidMonths) {
            const totalPrice = PRICE_TABLE[c.speed]?.[paidMonths];
            if (totalPrice) monthlyRev = Math.round(totalPrice / totalMonths);
          }
        } catch {}
      }
      speedMap[c.speed].revenue += monthlyRev;
    }
    return Object.values(speedMap)
      .filter(r => r.customerCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map(r => ({
        packageId: r.speed,
        packageName: r.speed,
        speed: r.speed,
        customerCount: r.activeCount,
        allCount: r.customerCount,
        revenue: r.revenue,
        pct: total ? Math.round((r.activeCount / total) * 100) : 0,
      }));
  }, [customers, total]);

  // Prefer real package data from DB; fall back to customer-based calculation
  const effectivePkgRows = (byPackage ?? []).length > 0 ? (byPackage ?? []) : accurateRevenuePkgRows;

  const pkgData = effectivePkgRows.map((p, i) => ({
    name: (p.packageName ?? p.speed ?? "").length > 12 ? (p.packageName ?? p.speed ?? "").slice(0, 12) + "…" : (p.packageName ?? p.speed ?? ""),
    fullName: p.packageName ?? p.speed ?? "",
    ລູກຄ້າ: p.customerCount,
    ລາຍຮັບ: Math.round(p.revenue / 1000),
    color: REDS[i % REDS.length],
  }));
  const totalPkgCustomers = effectivePkgRows.reduce((s, x) => s + x.customerCount, 0);
  const totalRevenue       = effectivePkgRows.reduce((s, x) => s + x.revenue, 0);

  const urgentList = (expiringSoon ?? [])
    .filter(c => differenceInDays(parseISO(c.expiryDate), now) <= 7)
    .sort((a, b) => differenceInDays(parseISO(a.expiryDate), now) - differenceInDays(parseISO(b.expiryDate), now))
    .slice(0, 15);

  const expiredBreakdown = [
    { label: "≤ 6 ເດືອນ",    count: summary?.expiredPeriod1 ?? 0, color: "bg-amber-400",  grad: "linear-gradient(90deg,#f59e0b,#fbbf24)", bar: "bg-amber-100" },
    { label: "6 – 12 ເດືອນ", count: summary?.expiredPeriod2 ?? 0, color: "bg-orange-500", grad: "linear-gradient(90deg,#f97316,#fb923c)", bar: "bg-orange-100" },
    { label: "12+ ເດືອນ",    count: summary?.expiredPeriod3 ?? 0, color: "bg-red-600",    grad: "linear-gradient(90deg,#ef4444,#f87171)", bar: "bg-red-100" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ══ Header ══ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-sm">
            <BarChart2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">ລາຍງານ & ສະຖິຕິ</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarDays size={12} /> {format(now, "dd/MM/yyyy · HH:mm")} · ວິເຄາະ / chart / export
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <LayoutDashboard size={14} /> ໜ້າຫຼັກ
          </button>
          <button
            onClick={() => exportFullReport({ summary, byPackage, expiringSoon, bySpeed, tickets: ticketList, customers })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <FileSpreadsheet size={16} /> ດາວໂຫຼດ Excel ທັງໝົດ
          </button>
        </div>
      </div>

      {/* ══ ສຸຂະພາບລະບົບ (ຍ້າຍຈາກໜ້າຫຼັກ) ══ */}
      <SectionDivider icon={Activity} title="ສຸຂະພາບລະບົບ" sub="ພາບລວມສັດສ່ວນ · ຄວາມໄວ · ແພັກເກດ" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Circle health stats */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={CheckCircle2} title="ອັດຕາສຸຂະພາບລູກຄ້າ" sub="ໃຊ້ງານ / ໃກ້ໝົດ / ໝົດ" />
          <div className="flex items-center justify-around py-2">
            <CircleStat label="ລູກຄ້າໃຊ້ງານ"  pct={total > 0 ? Math.round((active / total) * 100) : 0}   color="hsl(160,60%,45%)" icon={CheckCircle2} />
            <CircleStat label="ໃກ້ໝົດອາຍຸ"    pct={total > 0 ? Math.round(((summary?.expiringSoon ?? 0) / total) * 100) : 0} color="hsl(40,90%,52%)"  icon={Clock} />
            <CircleStat label="ໝົດອາຍຸ"        pct={total > 0 ? Math.round(((summary?.expiredCustomers ?? 0) / total) * 100) : 0} color={RED} icon={XCircle} />
          </div>
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-extrabold text-emerald-600">{active}</div>
              <div className="text-[10px] text-muted-foreground">ໃຊ້ງານ</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-amber-500">{summary?.expiringSoon ?? 0}</div>
              <div className="text-[10px] text-muted-foreground">ໃກ້ໝົດ</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-red-600">{summary?.expiredCustomers ?? 0}</div>
              <div className="text-[10px] text-muted-foreground">ໝົດ</div>
            </div>
          </div>
        </div>

        {/* Package pie */}
        {pkgData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <SectionHeader icon={Wifi} title="ລູກຄ້າຕາມແພັກເກດ" sub="ສ່ວນແບ່ງຈຳນວນລູກຄ້າ" />
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pkgData.map(p => ({ name: p.name, value: p.ລູກຄ້າ }))} cx="50%" cy="50%"
                    innerRadius={32} outerRadius={56} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {pkgData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontFamily: "'Noto Sans Lao', sans-serif", fontSize: 11 }}
                    formatter={(v) => [`${v} ຄົນ`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pkgData.slice(0, 6).map(d => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-foreground">{d.ລູກຄ້າ} ຄົນ</span>
                      <span className="text-[11px] font-semibold" style={{ color: d.color }}>
                        {totalPkgCustomers > 0 ? Math.round((d.ລູກຄ້າ / totalPkgCustomers) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 1: ລູກຄ້າ ══ */}
      <SectionDivider icon={Users} title="ລູກຄ້າ" sub="ພາບລວມລູກຄ້າທັງໝົດໃນລະບົບ" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard label="ລູກຄ້າທັງໝົດ"     value={total.toLocaleString()}    sub={`ໃຊ້ງານ ${active.toLocaleString()} ຄົນ`}  icon={Users}         colorClass="bg-indigo-500"  border="border-l-indigo-500"  badge={{ text: "100%", cls: "bg-indigo-50 text-indigo-700" }} />
        <KpiCard label="ອັດຕາໃຊ້ງານ"       value={`${activeRate}%`}          sub={`${active} / ${total} ຄົນ`}                icon={TrendingUp}    colorClass="bg-emerald-600" border="border-l-emerald-500" badge={{ text: activeRate >= 70 ? "ດີ" : "ຕ່ຳ", cls: activeRate >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700" }} />
        <KpiCard label="ລາຍຮັບລວມ"         value={revenue > 0 ? `${(revenue/1e6).toFixed(1)}M` : "—"} sub={revenue > 0 ? `${revenue.toLocaleString()} ກີບ` : "ຈາກແພັກເກດ"}  icon={DollarSign}    colorClass="bg-teal-600"    border="border-l-teal-500" />
        <KpiCard label="ລູກຄ້າ VIP"        value={summary?.vipCustomers ?? 0} sub={`${vipPct}% ຂອງທັງໝົດ`}                 icon={Star}          colorClass="bg-amber-500"   border="border-l-amber-400"  badge={{ text: `${vipPct}%`, cls: "bg-amber-50 text-amber-700" }} />
        <KpiCard label="ໃກ້ໝົດອາຍຸ (≤30ວ)" value={summary?.expiringSoon ?? 0} sub="ຕ້ອງຕິດຕາມດ່ວນ"                          icon={AlertTriangle} colorClass="bg-amber-500"   border="border-l-amber-400"  badge={{ text: "⚠ ດ່ວນ", cls: "bg-amber-50 text-amber-700" }} />
        <KpiCard label="ໝົດອາຍຸທັງໝົດ"     value={totalExpired.toLocaleString()} sub={`ໃໝ່ ${summary?.expiredPeriod1 ?? 0} · ເກົ່າ ${(summary?.expiredPeriod2??0)+(summary?.expiredPeriod3??0)}`} icon={UserX} colorClass="bg-red-600" border="border-l-red-500" badge={{ text: "ໝົດ", cls: "bg-red-50 text-red-700" }} />
      </div>

      {/* Status + Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Users} title="ສັດສ່ວນສະຖານະລູກຄ້າ" sub="ພາບລວມ active / inactive / expired" />
          {statusData.length === 0 ? <EmptyState /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="48%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {statusData.map(d => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-sm text-muted-foreground font-medium">{d.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-foreground">{d.value} <span className="text-[10px] text-muted-foreground font-normal">({total ? Math.round(d.value/total*100) : 0}%)</span></span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${total ? Math.round(d.value/total*100) : 0}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Zap} title="ຄວາມໄວທີ່ນິຍົມ" sub="ສ່ວນແບ່ງ Internet speed" />
          {speedData.length === 0 ? <EmptyState /> : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={speedData.map(s => ({ name: s.speed, value: s.customerCount }))} cx="50%" cy="50%" outerRadius={66} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {speedData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {speedData.slice(0, 5).map(s => (
                  <div key={s.speed}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-muted-foreground font-medium">{s.speed}</span>
                      </div>
                      <span className="font-extrabold" style={{ color: s.color }}>{s.customerCount} ຄົນ · {s.pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type grid */}
      {typeData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Building2} title="ການແຈກຢາຍຕາມປະເພດລູກຄ້າ" sub="ສ່ວນແບ່ງ 11 ປະເພດ" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {typeData.map(({ name, label, value, color, gradient }) => {
              const pct = total ? Math.round((value / total) * 100) : 0;
              return (
                <div key={name} className="rounded-xl border border-border p-3.5 text-center hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xl" style={{ background: color + "18" }}>{name.split(" ")[0]}</div>
                  <div className="text-xl font-extrabold text-foreground">{value}</div>
                  <div className="text-[11px] font-bold text-muted-foreground">{name.split(" ")[1]}</div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{label}</div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gradient }} />
                  </div>
                  <div className="text-[10px] font-bold mt-1" style={{ color }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* ══ SECTION 2: ຕິດຕາມ ══ */}
      <SectionDivider icon={Activity} title="ຕິດຕາມ" sub="ຄວາມຄືບໜ້າການຕິດຕາມລູກຄ້າໝົດ ແລະ ໃກ້ໝົດອາຍຸ" />

      {/* Follow-up progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Activity} title="ຄວາມຄືບໜ້າການຕິດຕາມ" sub={`ສຳເລັດ ${followed} / ${needFollow} ຄົນ · ${followPct}%`} />
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-4">
            <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${followPct}%`, background: "linear-gradient(90deg,#C62828,#e53935)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {followSteps.map(st => (
              <div key={st.value} className={`rounded-xl border p-3.5 ${st.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                  <span className="text-xs font-semibold text-foreground">{st.label}</span>
                </div>
                <div className={`text-2xl font-extrabold ${st.text}`}>{st.count}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {needFollow > 0 ? Math.round((st.count / needFollow) * 100) : 0}% ຂອງທັງໝົດ
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Clock} title="ການຕິດຕາມຕາມຊ່ວງໝົດອາຍຸ" sub="ລູກຄ້າຕາມຊ່ວງເວລາ × ສະຖານະຕິດຕາມ" />
          {periodChartData.every(r => FOLLOW_STEPS_META.every(s => r[s.label] === 0)) ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={periodChartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" vertical={false} />
                <XAxis dataKey="name" tick={{ ...FONT, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={FONT} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(0,0%,96%)" }} />
                <Legend wrapperStyle={{ ...FONT, fontSize: 10 }} />
                {FOLLOW_STEPS_META.map(s => (
                  <Bar key={s.value} dataKey={s.label} stackId="a" fill={s.chartColor} maxBarSize={52} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {periodData.map(p => (
          <div key={p.key} className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-xs font-bold text-foreground">{p.label}</span>
              <span className="ml-auto text-lg font-extrabold" style={{ color: p.color }}>{p.total}</span>
            </div>
            <div className="space-y-1.5">
              {p.byFollow.map(f => (
                <div key={f.label} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
                    <span className="text-muted-foreground">{f.label}</span>
                  </div>
                  <span className="font-bold text-foreground">{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Expiry timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Clock} title="ລູກຄ້າໝົດອາຍຸ 30 ວັນຕໍ່ໜ້າ" sub="ຈຳນວນທີ່ຈະໝົດຕາມອາທິດ" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={expiryByWeek} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" vertical={false} />
              <XAxis dataKey="name" tick={FONT} axisLine={false} tickLine={false} />
              <YAxis tick={FONT} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(0,0%,96%)" }} />
              <Bar dataKey="ໝົດ" fill="hsl(40,90%,52%)" radius={[6,6,0,0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-border space-y-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">ໝົດອາຍຸຕາມຊ່ວງ ({totalExpired} ຄົນ)</p>
            {expiredBreakdown.map(e => (
              <div key={e.label}>
                <div className="flex justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${e.color}`} /><span className="text-muted-foreground">{e.label}</span></div>
                  <span className="font-bold text-foreground">{e.count} ຄົນ</span>
                </div>
                <div className={`w-full ${e.bar} rounded-full h-1.5 overflow-hidden`}>
                  <div className="h-1.5 rounded-full" style={{ width: `${totalExpired ? Math.round((e.count/totalExpired)*100) : 0}%`, background: e.grad }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent ≤7 days */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="font-bold text-foreground text-sm">ລູກຄ້າໝົດອາຍຸໃນ 7 ວັນ</h3>
            {urgentList.length > 0 && <span className="ml-1 bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{urgentList.length}</span>}
          </div>
          {urgentList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">ບໍ່ມີລູກຄ້າໃກ້ໝົດອາຍຸ</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[320px]">
              {urgentList.map((c, idx) => {
                const days = differenceInDays(parseISO(c.expiryDate), now);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">{idx+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">{c.name}</span>
                        {c.vip && <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.phone} · {c.packageName ?? "—"}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {days < 0 ? (
                        <span className="text-[11px] font-bold text-red-600">ໝົດ {Math.abs(days)}ວ</span>
                      ) : (
                        <span className={`text-[11px] font-bold ${days === 0 ? "text-red-600" : days <= 3 ? "text-red-500" : "text-amber-600"}`}>
                          {days === 0 ? "ໝົດມື້ນີ້!" : `${days} ວັນ`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ SECTION 3: ແຈ້ງບັນຫາ ══ */}
      <SectionDivider icon={AlertCircle} title="ແຈ້ງບັນຫາ (Tickets)" sub="ສະຫຼຸບ Ticket ທັງໝົດໃນລະບົບ" />

      {/* Ticket KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Ticket ທັງໝົດ"  value={ticketList.length} sub={`Queued ${tOpen} · In Progress ${tInProgress}`} icon={TicketCheck}  colorClass="bg-indigo-500"  border="border-l-indigo-500" />
        <KpiCard label="Queued"          value={tOpen}             sub="ລໍຖ້າດຳເນີນງານ"                              icon={AlertCircle} colorClass="bg-blue-600"   border="border-l-blue-500"   badge={tOpen > 0 ? { text: "ດ່ວນ", cls: "bg-red-50 text-red-700" } : undefined} />
        <KpiCard label="Resolved"        value={tResolved}          sub={`Closed ${tClosed} user`}                      icon={CheckCircle2} colorClass="bg-emerald-600" border="border-l-emerald-500" />
        <KpiCard label="Ticket ດ່ວນ/ສູງ" value={`${tUrgent} / ${tHigh}`} sub="ຕ້ອງດຳເນີນການດ່ວນ"              icon={AlertTriangle} colorClass="bg-amber-500"  border="border-l-amber-400"  badge={tUrgent > 0 ? { text: "⚠", cls: "bg-amber-50 text-amber-700" } : undefined} />
      </div>

      {/* Ticket charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Status donut */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={AlertCircle} title="Ticket ຕາມສະຖານະ" />
          {ticketStatusData.length === 0 ? <EmptyState text="ຍັງບໍ່ມີ Ticket" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={ticketStatusData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {ticketStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {ticketStatusData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{d.value} <span className="text-muted-foreground font-normal">({ticketList.length ? Math.round(d.value/ticketList.length*100) : 0}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category bar */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={Wrench} title="Ticket ຕາມໝວດໝູ່" />
          {ticketCategoryData.length === 0 ? <EmptyState text="ຍັງບໍ່ມີ Ticket" /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ticketCategoryData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={FONT} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...FONT, fontSize: 10 }} axisLine={false} tickLine={false} width={88} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(0,0%,96%)" }} />
                  <Bar dataKey="value" name="ຈຳນວນ" radius={[0,6,6,0]} maxBarSize={24}>
                    {ticketCategoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Priority */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <SectionHeader icon={AlertTriangle} title="Ticket ຕາມຄວາມດ່ວນ" />
          {ticketPriorityData.length === 0 ? <EmptyState text="ຍັງບໍ່ມີ Ticket" /> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={ticketPriorityData} cx="50%" cy="50%" outerRadius={72} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {ticketPriorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {ticketPriorityData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent open tickets table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <AlertCircle size={15} className="text-red-500" />
          <h3 className="font-bold text-foreground text-sm">Ticket ທີ່ຍັງ Queued / In Progress</h3>
          {recentOpenTickets.length > 0 && <span className="ml-1 bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{recentOpenTickets.length}</span>}
        </div>
        {recentOpenTickets.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-50" />
            <p className="text-sm text-muted-foreground">ບໍ່ມີ Ticket ທີ່ຄ້າງ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["ເລກ","ລູກຄ້າ","ເບີໂທ","ໝວດ","ຄວາມດ່ວນ","ສະຖານະ","ວັນແຈ້ງ"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOpenTickets.map(t => {
                  const sm = TICKET_STATUS_META[t.status] ?? TICKET_STATUS_META.open;
                  const pm = PRIORITIES_META[t.priority] ?? PRIORITIES_META.normal;
                  const cm = CATEGORIES_META.find(c => c.value === t.category);
                  const CIcon = cm?.icon ?? HelpCircle;
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{t.ticketNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">{t.customerName ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{t.customerPhone ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: cm?.color }}>
                          <CIcon size={12} /> {t.category}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${pm.bg}`}>{pm.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} /> {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{t.reportedAt ? format(parseISO(t.reportedAt), "dd/MM/yy HH:mm") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Ticket Detail Panel ══ */}
      <TicketDetailPanel tickets={ticketList} />

    </div>
  );
}

// ─── Ticket Detail Panel (3 tabs) ─────────────────────────────────────────────
function TicketDetailPanel({ tickets }) {
  const [tab, setTab] = useState("pending");
  const [searchDate, setSearchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [resolvedDate, setResolvedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedDay, setExpandedDay] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturingKey, setCapturingKey] = useState(null);
  const [imgSections, setImgSections] = useState({ pending: true, received: true, resolved: true });
  const printRef = useRef(null);
  const printRef1 = useRef(null);
  const printRef2 = useRef(null);
  const printRef3 = useRef(null);
  const printRefCustom = useRef(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const pendingTickets = useMemo(() =>
    tickets.filter(t => t.status === "open" || t.status === "in_progress")
      .sort((a, b) =>
        new Date(b.reportedAt || b.createdAt) - new Date(a.reportedAt || a.createdAt)
      ),
  [tickets]);

  const receivedTickets = useMemo(() =>
    tickets.filter(t => t.reportedAt && t.reportedAt.slice(0, 10) === searchDate)
      .sort((a, b) => new Date(b.reportedAt || b.createdAt) - new Date(a.reportedAt || a.createdAt)),
  [tickets, searchDate]);

  const resolvedByDay = useMemo(() => {
    const done = tickets.filter(t => t.status === "resolved" || t.status === "closed");
    const byDay = {};
    done.forEach(t => {
      const day = (t.updatedAt ?? t.createdAt ?? "").slice(0, 10);
      if (!day) return;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(t);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, list]) => ({ date, list }));
  }, [tickets]);

  const resolvedOnDay = useMemo(() =>
    tickets.filter(t =>
      (t.status === "resolved" || t.status === "closed") &&
      (t.updatedAt ?? "").slice(0, 10) === resolvedDate
    ).sort((a, b) => new Date(b.reportedAt || b.createdAt) - new Date(a.reportedAt || a.createdAt)),
  [tickets, resolvedDate]);

  // ── Export all 3 sections to one Excel file ──────────────────────────────
  async function exportTicketReport() {
    setIsExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "LTC FTTH Tracker";
      wb.created = new Date();

      const RED = "FFA93226";
      const ORANGE = "FFE67E22";
      const GREEN = "FF27AE60";
      const BLUE = "FF2980B9";
      const GRAY = "FFB0BEC5";
      const WHITE = "FFFFFFFF";

      const priorityLabel = { urgent: "ດ່ວນ", high: "ສູງ", normal: "ປົກກະຕິ", low: "ຕ່ຳ" };
      const statusLabel = { open: "Queued", in_progress: "In Progress", pending: "Pending", resolved: "Resolved", closed: "Closed" };

      const TICKET_COLS = [
        { header: "#",              key: "no",       width: 6 },
        { header: "ເລກ Ticket",    key: "no_ticket", width: 16 },
        { header: "ຊື່ລູກຄ້າ",    key: "name",      width: 22 },
        { header: "ເບີໂທ",         key: "phone",     width: 14 },
        { header: "ລະຫັດ",         key: "account",   width: 14 },
        { header: "ທີ່ຢູ່",         key: "address",   width: 26 },
        { header: "ໝວດ",           key: "category",  width: 18 },
        { header: "ຄວາມດ່ວນ",     key: "priority",  width: 12 },
        { header: "ສະຖານະ",       key: "status",    width: 14 },
        { header: "ວັນທີແຈ້ງ",   key: "reported",  width: 14 },
        { header: "ລາຍລະອຽດ",    key: "desc",      width: 40 },
      ];

      function styleHeader(ws, fillArgb) {
        const row = ws.getRow(1);
        row.font = { bold: true, color: { argb: WHITE }, size: 10 };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
        row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        row.height = 28;
        row.eachCell(cell => { cell.border = { bottom: { style: "thin", color: { argb: WHITE } } }; });
      }

      function ticketRows(list) {
        return list.map((t, i) => ({
          no: i + 1,
          no_ticket: t.ticketNumber ?? "",
          name: t.customerName ?? "",
          phone: t.customerPhone ?? "",
          account: t.customerAccountId ?? "",
          address: t.customerAddress ?? "",
          category: t.category ?? "",
          priority: priorityLabel[t.priority] ?? t.priority ?? "",
          status: statusLabel[t.status] ?? t.status ?? "",
          reported: t.reportedAt ? format(parseISO(t.reportedAt), "dd/MM/yyyy HH:mm") : "",
          desc: t.description ?? "",
        }));
      }

      function addSummaryRow(ws, label, count, fillArgb) {
        const r = ws.addRow([label, count]);
        r.font = { bold: true, size: 10 };
        r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
        r.getCell(1).font = { bold: true, color: { argb: WHITE }, size: 10 };
        r.getCell(2).alignment = { horizontal: "center" };
      }

      // ── Sheet 1: งานค้างทั้งหมด ─────────────────────────────────────────
      const ws1 = wb.addWorksheet("ວຽກຄ້າງທັງໝົດ", { properties: { tabColor: { argb: RED } } });
      ws1.columns = TICKET_COLS;
      styleHeader(ws1, RED);
      const pendingRows = ticketRows(pendingTickets);
      pendingRows.forEach(r => ws1.addRow(r));
      ws1.addRow([]);
      addSummaryRow(ws1, "ລວມທັງໝົດ", pendingTickets.length, RED);
      addSummaryRow(ws1, "ດ່ວນ (urgent)", pendingTickets.filter(t=>t.priority==="urgent").length, ORANGE);
      addSummaryRow(ws1, "ສູງ (high)", pendingTickets.filter(t=>t.priority==="high").length, BLUE);
      addSummaryRow(ws1, "Queued (open)", pendingTickets.filter(t=>t.status==="open").length, GRAY);
      addSummaryRow(ws1, "In Progress (in_progress)", pendingTickets.filter(t=>t.status==="in_progress").length, GRAY);
      ws1.getColumn("no").alignment = { horizontal: "center" };
      ws1.getColumn("priority").alignment = { horizontal: "center" };
      ws1.getColumn("status").alignment = { horizontal: "center" };
      ws1.getColumn("reported").alignment = { horizontal: "center" };

      // ── Sheet 2: งานรับวันที่ X ──────────────────────────────────────────
      const label2 = `ຮັບ ${searchDate ? format(parseISO(searchDate), "dd-MM-yyyy") : ""}`;
      const ws2 = wb.addWorksheet(label2, { properties: { tabColor: { argb: BLUE } } });
      ws2.columns = TICKET_COLS;
      styleHeader(ws2, BLUE);
      ticketRows(receivedTickets).forEach(r => ws2.addRow(r));
      ws2.addRow([]);
      addSummaryRow(ws2, `ຮັບໃນວັນ ${searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : ""}`, receivedTickets.length, BLUE);

      // ── Sheet 3: งานเสร็จวันที่ X ───────────────────────────────────────
      const label3 = `ສຳເລັດ ${resolvedDate ? format(parseISO(resolvedDate), "dd-MM-yyyy") : ""}`;
      const ws3 = wb.addWorksheet(label3, { properties: { tabColor: { argb: GREEN } } });
      ws3.columns = TICKET_COLS;
      styleHeader(ws3, GREEN);
      ticketRows(resolvedOnDay).forEach(r => ws3.addRow(r));
      ws3.addRow([]);
      addSummaryRow(ws3, `ສຳເລັດວັນ ${resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : ""}`, resolvedOnDay.length, GREEN);

      // ── Sheet 4: งานเสร็จทุกวัน (สรุปรายวัน + รายชื่อ) ─────────────────
      const ws4 = wb.addWorksheet("ສຳເລັດທຸກວັນ", { properties: { tabColor: { argb: "FF16A085" } } });
      ws4.columns = [
        { header: "ວັນທີ", key: "date", width: 14 },
        { header: "ຈຳນວນ (user)", key: "count", width: 12 },
        { header: "ເລກ Ticket", key: "no_ticket", width: 16 },
        { header: "ຊື່ລູກຄ້າ", key: "name", width: 22 },
        { header: "ເບີໂທ", key: "phone", width: 14 },
        { header: "ໝວດ", key: "category", width: 18 },
        { header: "ຄວາມດ່ວນ", key: "priority", width: 12 },
        { header: "ລາຍລະອຽດ", key: "desc", width: 40 },
      ];
      styleHeader(ws4, "FF16A085");
      resolvedByDay.forEach(({ date, list }) => {
        list.forEach((t, i) => {
          const r = ws4.addRow({
            date: i === 0 ? format(parseISO(date), "dd/MM/yyyy") : "",
            count: i === 0 ? list.length : "",
            no_ticket: t.ticketNumber ?? "",
            name: t.customerName ?? "",
            phone: t.customerPhone ?? "",
            category: t.category ?? "",
            priority: priorityLabel[t.priority] ?? "",
            desc: t.description ?? "",
          });
          if (i === 0) {
            r.getCell(1).font = { bold: true };
            r.getCell(2).font = { bold: true };
            r.getCell(2).alignment = { horizontal: "center" };
          }
        });
        ws4.addRow([]);
      });

      // Save
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tickets_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("ດາວໂຫລດບໍ່ສຳເລັດ: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  const TABS = [
    { key: "pending",  label: "ວຽກທີ່ຄ້າງທັງໝົດ", icon: AlertCircle,  badgeCls: "bg-red-500", badge: pendingTickets.length },
    { key: "received", label: "ຮັບຕາມວັນທີ",       icon: CalendarDays, badge: null },
    { key: "resolved", label: "ສຳເລັດຕາມວັນທີ",    icon: CheckCircle2, badge: null },
  ];

  function THead({ showStatus }) {
    return (
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          {["#","ເລກ Ticket","ຊື່ລູກຄ້າ","ທີ່ຢູ່","ໝວດ","ຄວາມດ່ວນ",
            ...(showStatus ? ["ສະຖານະ"] : []),
            "ວັນທີແຈ້ງ","ລາຍລະອຽດ"
          ].map(h => (
            <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function TRow({ t, idx, showStatus }) {
    const sm = TICKET_STATUS_META[t.status] ?? TICKET_STATUS_META.open;
    const pm = PRIORITIES_META[t.priority] ?? PRIORITIES_META.normal;
    const cm = CATEGORIES_META.find(c => c.value === t.category);
    const CIcon = cm?.icon ?? HelpCircle;
    return (
      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{idx + 1}</td>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{t.ticketNumber}</td>
        <td className="px-4 py-3">
          <div className="font-semibold text-sm text-foreground">{t.customerName ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{t.customerPhone ?? ""}{t.customerAccountId ? ` · ${t.customerAccountId}` : ""}</div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[130px] truncate">{t.customerAddress ?? "—"}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: cm?.color }}>
            <CIcon size={12} />{t.category}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${pm.bg}`}>{pm.label}</span>
        </td>
        {showStatus && (
          <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sm.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
            </span>
          </td>
        )}
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {t.reportedAt ? format(parseISO(t.reportedAt), "dd/MM/yy HH:mm") : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
          <span className="truncate block">{t.description || "—"}</span>
        </td>
      </tr>
    );
  }

  // ── Export as PNG image ──────────────────────────────────────────────────
  async function captureRef(ref, filename, key) {
    if (isCapturing) return;
    setIsCapturing(true);
    setCapturingKey(key);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = ref.current;
      if (!el) return;
      el.style.display = "block";
      await new Promise(r => setTimeout(r, 150));
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        scrollX: 0, scrollY: 0, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
      });
      el.style.display = "none";
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("Image export failed", err);
      alert("ດາວໂຫລດຮູບບໍ່ສຳເລັດ: " + err.message);
    } finally {
      setIsCapturing(false);
      setCapturingKey(null);
    }
  }

  const exportAsImage = () => captureRef(printRef, `Tickets_All_${format(new Date(), "yyyyMMdd_HHmm")}.png`, "all");
  const exportPending  = () => captureRef(printRef1, `Tickets_Queued_${format(new Date(), "yyyyMMdd_HHmm")}.png`, "pending");
  const exportReceived = () => captureRef(printRef2, `Tickets_Received_${format(new Date(), "yyyyMMdd_HHmm")}.png`, "received");
  const exportResolved = () => captureRef(printRef3, `Tickets_Resolved_${format(new Date(), "yyyyMMdd_HHmm")}.png`, "resolved");
  const exportCustomImage = () => captureRef(printRefCustom, `Tickets_Custom_${format(new Date(), "yyyyMMdd_HHmm")}.png`, "custom");
  const toggleSection = (key) => setImgSections(s => ({ ...s, [key]: !s[key] }));

  const priorityLabel = { urgent: "ດ່ວນ", high: "ສູງ", normal: "ປົກກະຕິ", low: "ຕ່ຳ" };
  const statusLabel   = { open: "Queued", in_progress: "In Progress", pending: "Pending", resolved: "Resolved", closed: "Closed" };

  return (
    <>
    {/* ── Hidden print container (captured by html2canvas) ── */}
    {/* ── Hidden: ALL sections combined ── */}
    <div ref={printRef} style={{ display: "none", width: 1400, fontFamily: "'Noto Sans Lao', sans-serif", background: "#fff", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "3px solid #a93226", paddingBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#a93226" }}>ລາຍງານ Ticket — LTC FTTH Tracker</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>ດາວໂຫລດໃນວັນທີ {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </div>
      <PrintSection title={`ວຽກທີ່ຄ້າງທັງໝົດ (${pendingTickets.length} user)`} color="#a93226" extra={`Queued ${pendingTickets.filter(t=>t.status==="open").length} · In Progress ${pendingTickets.filter(t=>t.status==="in_progress").length} · ດ່ວນ ${pendingTickets.filter(t=>t.priority==="urgent").length}`}>
        <PrintTable list={pendingTickets} />
      </PrintSection>
      <div style={{ height: 24 }} />
      <PrintSection title={`ວຽກທີ່ຮັບໃນວັນທີ ${searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"} (${receivedTickets.length} user)`} color="#2980b9">
        {receivedTickets.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີ Ticket ໃນວັນນີ້</div> : <PrintTable list={receivedTickets} />}
      </PrintSection>
      <div style={{ height: 24 }} />
      <PrintSection title={`ວຽກສຳເລັດໃນວັນທີ ${resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"} (${resolvedOnDay.length} user)`} color="#27ae60">
        {resolvedOnDay.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີວຽກສຳເລັດໃນວັນນີ້</div> : <PrintTable list={resolvedOnDay} />}
      </PrintSection>
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 12 }}>LTC FTTH Tracker · ຜະລິດໂດຍລະບົບ LTC FTTH Tracker</div>
    </div>

    {/* ── Hidden: Section 1 — Pending only ── */}
    <div ref={printRef1} style={{ display: "none", width: 1400, fontFamily: "'Noto Sans Lao', sans-serif", background: "#fff", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "3px solid #a93226", paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#a93226" }}>ວຽກທີ່ຄ້າງ — LTC FTTH Tracker</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </div>
      <PrintSection title={`ວຽກທີ່ຄ້າງທັງໝົດ (${pendingTickets.length} user)`} color="#a93226" extra={`Queued ${pendingTickets.filter(t=>t.status==="open").length} · In Progress ${pendingTickets.filter(t=>t.status==="in_progress").length} · ດ່ວນ ${pendingTickets.filter(t=>t.priority==="urgent").length}`}>
        <PrintTable list={pendingTickets} />
      </PrintSection>
    </div>

    {/* ── Hidden: Section 2 — Received on date ── */}
    <div ref={printRef2} style={{ display: "none", width: 1400, fontFamily: "'Noto Sans Lao', sans-serif", background: "#fff", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "3px solid #2980b9", paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#2980b9" }}>ວຽກຮັບຕາມວັນ — LTC FTTH Tracker</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>ວັນທີ {searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"} · {format(new Date(), "HH:mm")}</div>
      </div>
      <PrintSection title={`ວຽກທີ່ຮັບໃນວັນທີ ${searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"} (${receivedTickets.length} user)`} color="#2980b9">
        {receivedTickets.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີ Ticket ໃນວັນທີດັ່ງກ່າວ</div> : <PrintTable list={receivedTickets} />}
      </PrintSection>
    </div>

    {/* ── Hidden: Section 3 — Resolved on date ── */}
    <div ref={printRef3} style={{ display: "none", width: 1400, fontFamily: "'Noto Sans Lao', sans-serif", background: "#fff", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "3px solid #27ae60", paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#27ae60" }}>ວຽກສຳເລັດ — LTC FTTH Tracker</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>ວັນທີ {resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"} · {format(new Date(), "HH:mm")}</div>
      </div>
      <PrintSection title={`ວຽກສຳເລັດໃນວັນທີ ${resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"} (${resolvedOnDay.length} user)`} color="#27ae60">
        {resolvedOnDay.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີວຽກສຳເລັດໃນວັນທີດັ່ງກ່າວ</div> : <PrintTable list={resolvedOnDay} />}
      </PrintSection>
    </div>

    {/* ── Hidden: Custom selected sections ── */}
    <div ref={printRefCustom} style={{ display: "none", width: 1400, fontFamily: "'Noto Sans Lao', sans-serif", background: "#fff", padding: 32, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "3px solid #a93226", paddingBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#a93226" }}>ລາຍງານ Ticket — LTC FTTH Tracker</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>ດາວໂຫລດໃນວັນທີ {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </div>
      {imgSections.pending && (
        <>
          <PrintSection title={`ວຽກທີ່ຄ້າງທັງໝົດ (${pendingTickets.length} user)`} color="#a93226" extra={`Queued ${pendingTickets.filter(t=>t.status==="open").length} · In Progress ${pendingTickets.filter(t=>t.status==="in_progress").length} · ດ່ວນ ${pendingTickets.filter(t=>t.priority==="urgent").length}`}>
            <PrintTable list={pendingTickets} />
          </PrintSection>
          <div style={{ height: 24 }} />
        </>
      )}
      {imgSections.received && (
        <>
          <PrintSection title={`ວຽກທີ່ຮັບໃນວັນທີ ${searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"} (${receivedTickets.length} user)`} color="#2980b9">
            {receivedTickets.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີ Ticket ໃນວັນນີ້</div> : <PrintTable list={receivedTickets} />}
          </PrintSection>
          <div style={{ height: 24 }} />
        </>
      )}
      {imgSections.resolved && (
        <PrintSection title={`ວຽກສຳເລັດໃນວັນທີ ${resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"} (${resolvedOnDay.length} user)`} color="#27ae60">
          {resolvedOnDay.length === 0 ? <div style={{ padding: "16px 0", color: "#999", fontSize: 13 }}>ບໍ່ມີວຽກສຳເລັດໃນວັນນີ້</div> : <PrintTable list={resolvedOnDay} />}
        </PrintSection>
      )}
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#aaa", borderTop: "1px solid #eee", paddingTop: 12 }}>LTC FTTH Tracker · ຜະລິດໂດຍລະບົບ LTC FTTH Tracker</div>
    </div>

    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(0,66%,42%)]/10 flex items-center justify-center">
            <List size={15} className="text-[hsl(0,66%,42%)]" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">ລາຍການ Ticket ລະອຽດ</h3>
            <p className="text-[11px] text-muted-foreground">ວຽກຄ້າງ · ຮັບຕາມວັນ · ສຳເລັດຕາມວັນ</p>
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Image download with checkboxes */}
          <div className="flex items-center gap-2 rounded-xl border border-[#16a085] px-3 py-1.5 bg-[#f0faf8]">
            <Camera size={13} className="text-[#16a085] shrink-0" />
            {[
              { key: "pending", label: "ວຽກຄ້າງ" },
              { key: "received", label: "ຮັບຕາມວັນ" },
              { key: "resolved", label: "ສຳເລັດ" },
            ].map(s => (
              <label key={s.key} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={imgSections[s.key]}
                  onChange={() => toggleSection(s.key)}
                  className="w-3.5 h-3.5 accent-[#16a085] cursor-pointer"
                />
                <span className="text-xs font-semibold text-[#16a085]">{s.label}</span>
              </label>
            ))}
            <button
              onClick={exportCustomImage}
              disabled={isCapturing || !Object.values(imgSections).some(Boolean)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ml-1"
              style={{ background: "#16a085" }}
            >
              {capturingKey === "custom" ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
              ດາວໂຫລດຮູບ
            </button>
          </div>
          {/* Excel download */}
          <button
            onClick={exportTicketReport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            style={{ background: "hsl(0,66%,42%)" }}
          >
            {isExporting ? (
              <><RefreshCw size={14} className="animate-spin" />ດາວໂຫລດ...</>
            ) : (
              <><FileSpreadsheet size={14} />Excel (.xlsx)</>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/20">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-[hsl(0,66%,42%)] text-[hsl(0,66%,42%)] bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon size={14} />
            {t.label}
            {t.badge !== null && t.badge > 0 && (
              <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${t.badgeCls}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 1: งานค้าง ── */}
      {tab === "pending" && (
        <>
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 flex-wrap">
            <AlertCircle size={14} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700">
              ວຽກຄ້າງທັງໝົດ: <strong>{pendingTickets.length} user</strong>
            </span>
            <span className="text-xs text-red-500">
              · Queued {pendingTickets.filter(t => t.status === "open").length}
              · In Progress {pendingTickets.filter(t => t.status === "in_progress").length}
              · ດ່ວນ {pendingTickets.filter(t => t.priority === "urgent").length}
            </span>
          </div>
          {pendingTickets.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">ບໍ່ມີວຽກທີ່ຄ້າງ 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <THead showStatus={true} />
                <tbody>
                  {pendingTickets.map((t, i) => <TRow key={t.id} t={t} idx={i} showStatus={true} />)}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t-2 border-border">
                    <td colSpan={9} className="px-4 py-3 text-xs font-bold text-muted-foreground">
                      ລວມ {pendingTickets.length} user ·
                      ດ່ວນ {pendingTickets.filter(t=>t.priority==="urgent").length} ·
                      ສູງ {pendingTickets.filter(t=>t.priority==="high").length} ·
                      ປົກກະຕິ {pendingTickets.filter(t=>t.priority==="normal").length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: งานรับตามวัน ── */}
      {tab === "received" && (
        <>
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap bg-muted/10">
            <CalendarDays size={14} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">ເລືອກວັນທີທີ່ຮັບວຽກ:</span>
            <DateInput
              isoMode
              size="sm"
              value={searchDate}
              onChange={setSearchDate}
              max={todayStr}
            />
            <span className="text-sm text-muted-foreground">
              ພົບ <strong className="text-foreground">{receivedTickets.length}</strong> user
            </span>
          </div>
          {receivedTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Search size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                ບໍ່ມີ Ticket ທີ່ຮັບໃນວັນທີ {searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <THead showStatus={true} />
                <tbody>
                  {receivedTickets.map((t, i) => <TRow key={t.id} t={t} idx={i} showStatus={true} />)}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-100">
                    <td colSpan={9} className="px-4 py-3 text-xs font-bold text-blue-700">
                      ຮັບໃນວັນທີ {searchDate ? format(parseISO(searchDate), "dd/MM/yyyy") : "—"} ທັງໝົດ {receivedTickets.length} user
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab 3: งานเสร็จตามวัน ── */}
      {tab === "resolved" && (
        <>
          {/* Date picker */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap bg-muted/10">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-foreground">ດູວຽກສຳເລັດວັນທີ:</span>
            <DateInput
              isoMode
              size="sm"
              value={resolvedDate}
              onChange={setResolvedDate}
              max={todayStr}
            />
            <span className="text-sm text-muted-foreground">
              ພົບ <strong className="text-foreground">{resolvedOnDay.length}</strong> user
            </span>
          </div>

          {/* Table for selected date */}
          {resolvedOnDay.length > 0 ? (
            <div className="overflow-x-auto border-b border-border">
              <table className="w-full text-sm">
                <THead showStatus={false} />
                <tbody>
                  {resolvedOnDay.map((t, i) => <TRow key={t.id} t={t} idx={i} showStatus={false} />)}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-100">
                    <td colSpan={8} className="px-4 py-3 text-xs font-bold text-emerald-700">
                      ສຳເລັດວັນ {resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"}: {resolvedOnDay.length} user
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center border-b border-border">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                ບໍ່ມີວຽກສຳເລັດໃນວັນ {resolvedDate ? format(parseISO(resolvedDate), "dd/MM/yyyy") : "—"}
              </p>
            </div>
          )}

          {/* Accordion: all days with resolved tickets */}
          <div className="px-5 py-2.5 bg-muted/10 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">ສະຫຼຸບທຸກວັນທີ່ມີວຽກສຳເລັດ</p>
          </div>
          {resolvedByDay.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີວຽກສຳເລັດ</div>
          ) : (
            <div className="divide-y divide-border">
              {resolvedByDay.map(({ date, list }) => {
                const isOpen = expandedDay === date;
                return (
                  <div key={date}>
                    <button onClick={() => setExpandedDay(isOpen ? null : date)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="font-semibold text-sm text-foreground">{format(parseISO(date), "dd/MM/yyyy")}</span>
                        <span className="text-xs text-muted-foreground">
                          (Resolved {list.filter(t=>t.status==="resolved").length} · Closed {list.filter(t=>t.status==="closed").length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-600">{list.length} user</span>
                        {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="overflow-x-auto bg-emerald-50/30">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-emerald-50 border-y border-emerald-100">
                              {["#","ເລກ","ຊື່ລູກຄ້າ","ທີ່ຢູ່","ໝວດ","ຄວາມດ່ວນ","ວັນທີແຈ້ງ","ລາຍລະອຽດ"].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 text-xs font-bold text-emerald-800 uppercase tracking-wide whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((t, i) => <TRow key={t.id} t={t} idx={i} showStatus={false} />)}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

// ─── Print helpers ────────────────────────────────────────────────────────────
function PrintSection({ title, color, extra, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        background: color, color: "#fff", padding: "8px 16px",
        borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{title}</span>
        {extra && <span style={{ fontSize: 11, opacity: 0.85 }}>{extra}</span>}
      </div>
      <div style={{ border: `1px solid ${color}`, borderTop: "none", borderRadius: "0 0 6px 6px", padding: "0 0 8px" }}>
        {children}
      </div>
    </div>
  );
}

function fmtRaw(str) {
  if (!str) return "—";
  const m = String(str).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  const d = String(str).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (d) return `${d[3]}/${d[2]}/${d[1]}`;
  return "—";
}

function PrintTable({ list, compact }) {
  const sColor = { open: "#e74c3c", in_progress: "#f39c12", pending: "#8e44ad", resolved: "#27ae60", closed: "#7f8c8d" };
  const sLabel = { open: "Queued", in_progress: "In Progress", pending: "Pending", resolved: "Resolved", closed: "Closed" };
  const cellStyle = { padding: compact ? "4px 8px" : "6px 10px", fontSize: compact ? 11 : 12, borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" };
  const headers = ["ວັນທີ່ແຈ້ງ", "ຊື່ລູກຄ້າ", "ເບີໂທ", "ເບີຕິດຕັດ", "ທີ່ຢູ່", "ລາຍລະອຽດ ບັນຫາ", "ວັນທີ່ແຈ້ງທີມ", "ສະຖານະ"];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <thead>
        <tr style={{ background: "#1565C0" }}>
          {headers.map(h => (
            <th key={h} style={{ padding: compact ? "5px 8px" : "7px 10px", fontSize: 11, fontWeight: 700, textAlign: "center", color: "#fff", whiteSpace: "nowrap", borderRight: "1px solid #1976D2" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {list.map((t, i) => (
          <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#f5f5f5" }}>
            <td style={{ ...cellStyle, width: 120, color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
              {fmtRaw(t.reportedAt)}
            </td>
            <td style={{ ...cellStyle, width: 140, fontWeight: 600, color: "#111" }}>{t.customerName ?? "—"}</td>
            <td style={{ ...cellStyle, width: 110, color: "#555", fontFamily: "monospace" }}>{t.customerPhone ?? "—"}</td>
            <td style={{ ...cellStyle, width: 110, color: "#555", fontFamily: "monospace" }}>{t.customerAccountId ?? "—"}</td>
            <td style={{ ...cellStyle, width: 160, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.customerAddress ?? "—"}</td>
            <td style={{ ...cellStyle, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "—"}</td>
            <td style={{ ...cellStyle, width: 120, color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
              {fmtRaw(t.dispatchedAt)}
            </td>
            <td style={{ ...cellStyle, width: 90, textAlign: "center", verticalAlign: "middle", background: sColor[t.status] ?? "#999", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 0 }}>
              {sLabel[t.status] ?? t.status}
            </td>
          </tr>
        ))}
        {list.length === 0 && (
          <tr><td colSpan={headers.length} style={{ padding: 16, textAlign: "center", color: "#999", fontSize: 12 }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
        )}
      </tbody>
    </table>
  );
}
