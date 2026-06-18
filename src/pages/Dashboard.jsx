// ════════════════════════════════════════════════════════════════
// Dashboard.jsx
// ໜ້າຫຼັກ — Performance Dashboard (ສີຕາມ theme ລະບົບ)
// ════════════════════════════════════════════════════════════════

import {
  useGetDashboardSummary,
  useListTickets,
  useGetCustomersByPackage,
} from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users, Star, AlertTriangle, XCircle, CheckCircle2,
  Clock, ChevronLeft, ChevronRight, ArrowRight,
  TicketCheck, AlertCircle, Zap, Activity, BarChart2,
  TrendingUp, TrendingDown, RefreshCw, Download,
  Wifi, DollarSign, UserCheck,
} from "lucide-react";
import { RenewModal } from "./Tracking";
import { useUpdateCustomer } from "@/lib/store";
import { differenceInDays, addDays, subDays, format } from "date-fns";
import { useLocation } from "wouter";
import { supabase, customerFromDb } from "@/lib/supabase";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";

const PAGE_SIZE = 10;

// ─── ສີຈາກ theme ລະບົບ ──────────────────────────────────────────
const PRIMARY     = "hsl(0,66%,42%)";
const PRIMARY_DK  = "hsl(0,66%,34%)";
const CHART_COLORS = [
  "hsl(0,66%,42%)",
  "hsl(38,90%,48%)",
  "hsl(217,80%,55%)",
  "hsl(142,56%,40%)",
  "hsl(271,75%,52%)",
  "hsl(0,66%,55%)",
  "hsl(38,90%,60%)",
  "hsl(217,80%,68%)",
];

const S_COLOR = {
  active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive:  "bg-muted text-muted-foreground border-border",
  suspended: "bg-amber-100 text-amber-700 border-amber-200",
  expired:   "bg-red-100 text-red-700 border-red-200",
};
const S_LABEL = {
  active: "ໃຊ້ງານ", inactive: "ບໍ່ໃຊ້ງານ", suspended: "ຖືກລະງັບ", expired: "ໝົດອາຍຸ",
};

// ─── ດຶງລູກຄ້າໃກ້ໝົດ/ໝົດ ─────────────────────────────────────────
function useExpiringList() {
  return useQuery({
    queryKey: ["dashboard/expiring-list"],
    queryFn: async () => {
      const past7    = subDays(new Date(), 7).toISOString().slice(0, 10);
      const future30 = addDays(new Date(), 30).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .gte("expiry_date", past7)
        .lte("expiry_date", future30)
        .order("expiry_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map(customerFromDb);
    },
    staleTime: 30_000,
  });
}

// ─── KPI Card ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, iconStyle, trend, trendLabel, href, urgent }) {
  const [, setLocation] = useLocation();
  const isUp   = trend === "up";
  const isDown = trend === "down";
  return (
    <div
      onClick={() => href && setLocation(href)}
      className={`bg-card rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer select-none ${urgent ? "border-red-200 bg-red-50/40 dark:bg-red-950/20" : "border-border"}`}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={iconStyle}
      >
        <Icon size={20} className="text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-2xl font-extrabold text-foreground leading-none">{value}</div>
        {(sub || trendLabel) && (
          <div className="flex items-center gap-1 mt-0.5">
            {trend && (isUp
              ? <TrendingUp size={10} className="text-emerald-500" />
              : <TrendingDown size={10} className="text-red-500" />
            )}
            <span className={`text-[10px] font-medium ${isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
              {trendLabel ?? sub}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, href }) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: PRIMARY }} />
        <h2 className="font-bold text-foreground text-sm">{title}</h2>
        {count != null && (
          <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {href && (
        <button
          onClick={() => setLocation(href)}
          className="flex items-center gap-1 text-[11px] font-semibold hover:underline transition-colors"
          style={{ color: PRIMARY }}
        >
          ທັງໝົດ <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Pie label ────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = outerRadius + 18;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill="hsl(0,0%,30%)" textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ════════════════════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: s, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: expiringList, isLoading: expiringLoading } = useExpiringList();
  const { data: tickets } = useListTickets();
  const { data: packageStats } = useGetCustomersByPackage();
  const [expiringPage, setExpiringPage] = useState(1);
  const [renewingCustomer, setRenewingCustomer] = useState(null);
  const updateMutation = useUpdateCustomer();

  const handleRenew = async (patch) => {
    if (!renewingCustomer) return;
    const { _paymentAmount, _paymentMethod, _paidMonths, _bonusMonths, ...customerPatch } = patch;
    await updateMutation.mutateAsync({ id: renewingCustomer.id, data: customerPatch });
    await qc.invalidateQueries({ queryKey: ["dashboard/expiring-list"] });
    setRenewingCustomer(null);
  };

  const now = new Date();

  // ── Derived stats ──────────────────────────────────────────────
  const total        = s?.totalCustomers    ?? 0;
  const active       = s?.safeCustomers     ?? 0;
  const expired      = s?.expiredCustomers  ?? 0;
  const soon         = s?.expiringSoon      ?? 0;
  const vip          = s?.vipCustomers      ?? 0;
  const revenue      = s?.totalMonthlyRevenue ?? 0;
  const followNeed   = s?.followNeedAction  ?? 0;
  const followInProg = s?.followInProgress  ?? 0;
  const followDone   = s?.followDone        ?? 0;
  const followComp   = s?.followCompleted   ?? 0;
  const needFollow   = followNeed + followInProg + followDone + followComp;
  const followed     = followDone + followComp;
  const followPct    = needFollow > 0 ? Math.round((followed / needFollow) * 100) : 0;

  const ticketList     = tickets ?? [];
  const tOpen          = ticketList.filter(t => t.status === "open").length;
  const tInProgress    = ticketList.filter(t => t.status === "in_progress").length;
  const tUrgent        = ticketList.filter(t => t.priority === "urgent").length;
  const tPending       = tOpen + tInProgress;
  const recentTickets  = ticketList
    .filter(t => t.status === "open" || t.status === "in_progress")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  // ── Pie chart ─────────────────────────────────────────────────
  const statusPie = [
    { name: "ໃຊ້ງານ (ປອດໄພ)",  value: active,  fill: "hsl(142,56%,40%)" },
    { name: "ໃກ້ໝົດ (≤7 ວັນ)", value: soon,    fill: "hsl(38,90%,48%)"  },
    { name: "ໝົດອາຍຸ",         value: expired, fill: PRIMARY             },
    { name: "VIP",              value: vip,     fill: "hsl(271,75%,52%)" },
  ].filter(d => d.value > 0);

  // ── Package bar ───────────────────────────────────────────────
  const pkgBar = (packageStats ?? [])
    .filter(p => p.customerCount > 0)
    .sort((a, b) => b.customerCount - a.customerCount)
    .slice(0, 8)
    .map(p => ({ name: p.speed ?? p.packageName ?? "—", value: p.customerCount }));

  // ── Customer type bar ─────────────────────────────────────────
  const typeBar = CUSTOMER_TYPES
    .map(t => ({ name: t.emoji + " " + t.label, code: t.code, value: s?.[`type_${t.code}`] ?? 0, fill: t.color }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ── Follow-up bar ─────────────────────────────────────────────
  const followBar = [
    { name: "ຕ້ອງຕິດຕາມ",   value: followNeed,   fill: PRIMARY              },
    { name: "ກຳລັງຕິດຕາມ", value: followInProg, fill: "hsl(38,90%,48%)"   },
    { name: "ຕິດຕາມແລ້ວ",   value: followDone,   fill: "hsl(217,80%,55%)"  },
    { name: "ສຳເລັດ",       value: followComp,   fill: "hsl(142,56%,40%)"  },
  ].filter(d => d.value > 0);

  // ── Expiring pagination ───────────────────────────────────────
  const list       = expiringList ?? [];
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage   = Math.min(expiringPage, totalPages);
  const pageItems  = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const fmtRevenue = revenue >= 1_000_000
    ? (revenue / 1_000_000).toFixed(1) + "M ₭"
    : revenue >= 1_000
    ? (revenue / 1_000).toFixed(0) + "K ₭"
    : revenue + " ₭";

  return (
    <>
    <div className="min-h-screen bg-background">

      {/* ════ HEADER ════ */}
      <div className="text-white px-5 pt-5 pb-6" style={{ background: `linear-gradient(135deg, ${PRIMARY_DK} 0%, ${PRIMARY} 100%)` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={18} className="text-red-200" />
              <span className="text-red-200 text-xs font-semibold uppercase tracking-widest">LTC FTTH</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">ລາຍງານສະຫຼຸບລະບົບ</h1>
            <p className="text-red-200 text-xs mt-0.5">{format(now, "dd/MM/yyyy HH:mm")} · ຂໍ້ມູນ Real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => qc.invalidateQueries()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw size={12} /> ໂຫລດໃໝ່
            </button>
            <button
              onClick={() => setLocation("/reports")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors shadow-sm border border-white/20"
            >
              <Download size={12} /> ລາຍງານ
            </button>
          </div>
        </div>

        {/* Mini summary strip */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: "ລູກຄ້າທັງໝົດ", value: total },
            { label: "ໃຊ້ງານ",        value: active },
            { label: "ໝົດອາຍຸ",       value: expired },
            { label: "Ticket ລໍ",      value: tPending },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-white">{value}</div>
              <div className="text-[10px] text-red-200 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">

        {/* ════ KPI CARDS ════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 bg-muted rounded w-3/4" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))
          ) : (
            <>
              <KpiCard
                label="ລູກຄ້າທັງໝົດ" value={total}
                sub={`${s?.totalPackages ?? 0} Package`}
                icon={Users}
                iconStyle={{ background: "hsl(217,80%,55%)" }}
                href="/customers"
              />
              <KpiCard
                label="ໃຊ້ງານ (ປອດໄພ)" value={active}
                trendLabel={`${total > 0 ? Math.round((active/total)*100) : 0}% ຈາກທັງໝົດ`}
                trend="up"
                icon={CheckCircle2}
                iconStyle={{ background: "hsl(142,56%,40%)" }}
                href="/customers?safe=true"
              />
              <KpiCard
                label="ໝົດອາຍຸ" value={expired}
                trendLabel={`${total > 0 ? Math.round((expired/total)*100) : 0}% ຂອງລູກຄ້າ`}
                trend={expired > 0 ? "down" : undefined}
                icon={XCircle}
                iconStyle={{ background: PRIMARY }}
                href="/customers?status=expired" urgent={expired > 0}
              />
              <KpiCard
                label="ໃກ້ໝົດ (≤7 ວັນ)" value={soon}
                trendLabel="ຕ້ອງຕໍ່ດ່ວນ"
                trend={soon > 0 ? "down" : undefined}
                icon={AlertTriangle}
                iconStyle={{ background: "hsl(38,90%,48%)" }}
                href="/tracking" urgent={soon > 0}
              />
              <KpiCard
                label="VIP" value={vip}
                trendLabel={`${total > 0 ? Math.round((vip/total)*100) : 0}% ຂອງລູກຄ້າ`}
                icon={Star}
                iconStyle={{ background: "hsl(271,75%,52%)" }}
                href="/customers?vip=true"
              />
              <KpiCard
                label="ລາຍຮັບ/ເດືອນ" value={fmtRevenue}
                trendLabel="ຈາກ Package ທັງໝົດ"
                icon={DollarSign}
                iconStyle={{ background: "hsl(0,66%,34%)" }}
                href="/revenue"
              />
            </>
          )}
        </div>

        {/* ════ CHARTS ROW 1 ════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Pie — ສະຖານະລູກຄ້າ */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <SectionHeader icon={Activity} title="ສະຖານະລູກຄ້າ" />
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={statusPie} cx="50%" cy="50%"
                  innerRadius={46} outerRadius={68}
                  paddingAngle={3} dataKey="value"
                  labelLine={false} label={PieLabel}
                  style={{ cursor: "pointer" }}
                  onClick={(entry) => {
                    const navMap = {
                      "ໃຊ້ງານ (ປອດໄພ)":  "/customers?safe=true",
                      "ໃກ້ໝົດ (≤7 ວັນ)": "/tracking",
                      "ໝົດອາຍຸ":          "/customers?status=expired",
                      "VIP":              "/customers?vip=true",
                    };
                    const target = navMap[entry?.name];
                    if (target) setLocation(target);
                  }}
                >
                  {statusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + " ຄົນ", n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {statusPie.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-[11px] text-muted-foreground truncate">{d.name}</span>
                  <span className="text-[11px] font-bold text-foreground ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar — Package */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <SectionHeader icon={BarChart2} title="ລູກຄ້າຕາມ Package" href="/reports" />
            {pkgBar.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pkgBar} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(0,0%,92%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={68} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v + " ຄົນ", "ລູກຄ້າ"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                    onClick={(d) => d?.name && setLocation(`/customers?speed=${encodeURIComponent(d.name)}`)}>
                    {pkgBar.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar — ການຕິດຕາມ */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <SectionHeader icon={UserCheck} title="ການຕິດຕາມລູກຄ້າ" href="/tracking" />
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">ຄວາມຄືບໜ້າ</span>
                <span className="font-bold" style={{ color: PRIMARY }}>{followed}/{needFollow} ({followPct}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${followPct}%`, background: `linear-gradient(90deg, ${PRIMARY_DK}, ${PRIMARY})` }}
                />
              </div>
            </div>
            {followBar.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={followBar} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0,0%,92%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v + " ຄົນ", ""]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}
                    onClick={(d) => {
                      if (!d?.name) return;
                      sessionStorage.setItem("tracking_init_tab", "all");
                      sessionStorage.setItem("tracking_init_search", "");
                      sessionStorage.setItem("tracking_follow_filter", d.name);
                      setLocation("/tracking");
                    }}>
                    {followBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ════ CHARTS ROW 2 ════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Bar — ປະເພດລູກຄ້າ */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <SectionHeader icon={Users} title="ລູກຄ້າຕາມປະເພດ" />
            {typeBar.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeBar} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(0,0%,92%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v + " ຄົນ", "ລູກຄ້າ"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}
                    onClick={(d) => d?.code && setLocation(`/customers?type=${encodeURIComponent(d.code)}`)}>
                    {typeBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ticket Panel */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <SectionHeader icon={AlertCircle} title="Ticket ທີ່ລໍຖ້າ" count={tPending} href="/reports" />
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "Queued",       value: tOpen,             bg: "bg-primary/8",   txt: "text-primary",    href: "/report-problem?status=open"        },
                { label: "In Progress",  value: tInProgress,       bg: "bg-amber-50",    txt: "text-amber-700",  href: "/report-problem?status=in_progress"  },
                { label: "ດ່ວນ (Urgent)", value: tUrgent,          bg: "bg-red-50",      txt: "text-red-700",    href: "/report-problem"                    },
                { label: "ທັງໝົດ Ticket", value: ticketList.length, bg: "bg-muted",      txt: "text-foreground", href: "/report-problem"                    },
              ].map(({ label, value, bg, txt, href }) => (
                <div key={label} onClick={() => setLocation(href)}
                  className={`rounded-xl border border-border p-3 cursor-pointer hover:shadow-sm transition-shadow ${bg}`}>
                  <div className={`text-xl font-extrabold ${txt}`}>{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {recentTickets.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" /> ບໍ່ມີ Ticket ທີ່ລໍຖ້າ
                </div>
              ) : recentTickets.map(t => {
                const isUrgent = t.priority === "urgent";
                const isHigh   = t.priority === "high";
                return (
                  <div
                    key={t.id}
                    onClick={() => setLocation("/report-problem")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${
                      isUrgent ? "bg-red-50 border-red-100" : isHigh ? "bg-amber-50 border-amber-100" : "bg-muted/40 border-border/60"
                    }`}
                  >
                    {isUrgent && <Zap size={11} style={{ color: PRIMARY }} className="flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{t.customerName ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.category ?? "—"}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      t.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    }`}>
                      {t.status === "in_progress" ? "In Progress" : "Queued"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════ EXPIRING TABLE ════ */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
          <SectionHeader icon={Clock} title="ລູກຄ້າໃກ້ໝົດ / ໝົດອາຍຸ" count={list.length} href="/tracking" />

          {expiringLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: "transparent" }} />
              ກຳລັງໂຫລດ...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <CheckCircle2 size={34} className="text-emerald-400" />
              <p className="text-sm font-medium">ບໍ່ມີລູກຄ້າໃກ້ໝົດ ຫຼື ໝົດອາຍຸ ໃນ 30 ວັນ</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_80px_90px_90px_80px] gap-2 px-3 py-2 bg-muted/60 rounded-xl mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>ຊື່ / ເບີໂທ</span>
                <span className="text-center">ປະເພດ</span>
                <span className="text-center">ຄວາມໄວ</span>
                <span className="text-center">ວັນໝົດ</span>
                <span className="text-right">ສະຖານະ</span>
              </div>
              <div className="space-y-1">
                {pageItems.map(c => {
                  const days      = differenceInDays(new Date(c.expiryDate), now);
                  const isExpired = days < 0;
                  const isUrgent  = days >= 0 && days <= 3;
                  const rowBg = isExpired
                    ? "bg-red-50 border border-red-100 hover:bg-red-100/70"
                    : isUrgent
                    ? "bg-amber-50 border border-amber-100 hover:bg-amber-100/70"
                    : "bg-muted/30 border border-border/50 hover:bg-muted/60";
                  return (
                    <div
                      key={c.id}
                      className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_90px_90px_110px] items-center gap-2 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${rowBg}`}
                      onClick={() => {
                        sessionStorage.setItem("tracking_highlight", JSON.stringify({ id: String(c.id), autoRenew: false }));
                        setLocation("/tracking");
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-foreground truncate">{c.name}</span>
                          {c.vip && <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{c.phone ?? "—"}</div>
                      </div>
                      <div className="hidden sm:block text-center text-[11px] text-muted-foreground">{c.customerType ?? "—"}</div>
                      <div className="hidden sm:block text-center text-[11px] font-medium text-foreground/70">{c.speed ?? "—"}</div>
                      <div className="hidden sm:block text-center">
                        <div className={`text-xs font-bold ${isExpired ? "text-red-600" : isUrgent ? "text-amber-600" : "text-orange-500"}`}>
                          {isExpired ? `ໝົດ ${Math.abs(days)} ວັນ` : `ເຫຼືອ ${days} ວັນ`}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{c.expiryDate}</div>
                      </div>
                      <div className="text-right sm:hidden">
                        <span className={`text-xs font-bold ${isExpired ? "text-red-600" : isUrgent ? "text-amber-600" : "text-orange-500"}`}>
                          {isExpired ? `ໝົດ ${Math.abs(days)} ວັນ` : `ເຫຼືອ ${days} ວັນ`}
                        </span>
                      </div>
                      <div className="hidden sm:flex justify-end items-center gap-1.5">
                        <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${S_COLOR[c.status] ?? ""}`}>
                          {S_LABEL[c.status] ?? c.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem("tracking_highlight", JSON.stringify({ id: String(c.id), autoRenew: true }));
                            setLocation("/tracking");
                          }}
                          className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(0,66%,42%)] text-white hover:bg-[hsl(0,66%,35%)] transition-colors"
                        >
                          ຕໍ່ອາຍຸ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    ໜ້າ {safePage} / {totalPages} · {list.length} ຄົນ
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpiringPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`d${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setExpiringPage(p)}
                            className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors border"
                            style={p === safePage
                              ? { background: PRIMARY, color: "white", borderColor: PRIMARY }
                              : { borderColor: "hsl(0,0%,88%)", color: "hsl(0,0%,46%)" }
                            }
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      onClick={() => setExpiringPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>

    {renewingCustomer && (
      <RenewModal
        customer={renewingCustomer}
        onClose={() => setRenewingCustomer(null)}
        onRenew={handleRenew}
      />
    )}
    </>
  );
}
