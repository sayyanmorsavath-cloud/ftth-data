// ════════════════════════════════════════════════════════════════
// StaffStats.jsx
// ສະຖິຕິປະສິດທິຜົນພະນັກງານ — ການຕໍ່ສັນຍາ, ການຕິດຕາມ, ລາຍຮັບ
// ════════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useListAllPayments } from "@/lib/store/payments";
import {
  BarChart2, TrendingUp, Users, DollarSign,
  CheckCircle2, PhoneCall, Star, RefreshCw,
  Calendar,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useState } from "react";

// ─── ດຶງ follow-up ທັງໝົດ ────────────────────────────────────
function useFollowUpStats() {
  return useQuery({
    queryKey: ["/api/staff-follow-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("follow_up_person, follow_up_status")
        .not("follow_up_person", "is", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── ການ​ vet KPI pill ──────────────────────────────────────────
function KPIPill({ label, value, icon: Icon, color, bg }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${bg}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} bg-white/60`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div>
        <div className={`text-xl font-black ${color}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}

// ─── Bar ໃນ horizontal bar chart ─────────────────────────────
function HBar({ name, value, max, color, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-foreground truncate max-w-[120px]">{name}</span>
        <span className={`font-black ${color}`}>{value.toLocaleString()}{sub}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const MONTH_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return {
    label: format(d, "MMM yyyy"),
    from:  startOfMonth(d).toISOString(),
    to:    endOfMonth(d).toISOString(),
  };
});

export default function StaffStats() {
  const [monthIdx, setMonthIdx] = useState(0);
  const sel = MONTH_OPTIONS[monthIdx];

  const { data: payments = [], isLoading: loadingPay } = useListAllPayments({ from: sel.from, to: sel.to });
  const { data: followRaw = [], isLoading: loadingFollow } = useFollowUpStats();

  const isLoading = loadingPay || loadingFollow;

  // ─── ສ​ຸ​ປ payments ຕາມ recorded_by ──────────────────────────
  const payByStaff = {};
  for (const p of payments) {
    const who = p.recordedBy || "ບໍ່​ລະ​ບຸ";
    if (!payByStaff[who]) payByStaff[who] = { count: 0, amount: 0 };
    payByStaff[who].count  += 1;
    payByStaff[who].amount += p.amount;
  }
  const payList = Object.entries(payByStaff)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);

  // ─── ສ​ຸ​ປ follow-up ຕາມ follow_up_person ────────────────────
  const followByStaff = {};
  for (const r of followRaw) {
    const who = r.follow_up_person || "ບໍ່ລະບຸ";
    if (!followByStaff[who]) followByStaff[who] = { total: 0, completed: 0, inProgress: 0 };
    followByStaff[who].total++;
    if (r.follow_up_status === "ສຳເລັດ")       followByStaff[who].completed++;
    if (r.follow_up_status === "ກຳລັງຕິດຕາມ") followByStaff[who].inProgress++;
  }
  const followList = Object.entries(followByStaff)
    .map(([name, v]) => ({ name, ...v, rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0 }))
    .sort((a, b) => b.completed - a.completed);

  const totalRenewals = payments.length;
  const totalAmount   = payments.reduce((s, p) => s + p.amount, 0);
  const totalFollowUp = followRaw.length;
  const totalDone     = followRaw.filter(r => r.follow_up_status === "ສຳເລັດ").length;

  const maxCount  = Math.max(...payList.map(p => p.count), 1);
  const maxFollow = Math.max(...followList.map(f => f.completed), 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-lg">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">ສະຖິຕິພະນັກງານ</h1>
            <p className="text-xs text-muted-foreground">ວັດແທກປະສິດທິຜົນທີມງານ</p>
          </div>
        </div>
        {/* Month selector */}
        <select
          value={monthIdx}
          onChange={e => setMonthIdx(Number(e.target.value))}
          className="text-sm border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]"
        >
          {MONTH_OPTIONS.map((m, i) => (
            <option key={i} value={i}>{m.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <RefreshCw size={16} className="animate-spin" /> ກຳລັງໂຫລດ...
        </div>
      ) : (
        <>
          {/* ─── KPI Overview ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPIPill label="ຕໍ່ສັນຍາທັງໝົດ"  value={totalRenewals.toLocaleString()} icon={TrendingUp}    color="text-emerald-700" bg="bg-emerald-50" />
            <KPIPill label="ລາຍຮັບທັງໝົດ"     value={`${totalAmount.toLocaleString()} ກີບ`} icon={DollarSign} color="text-blue-700"    bg="bg-blue-50" />
            <KPIPill label="ຕິດຕາມທັງໝົດ"     value={totalFollowUp.toLocaleString()}  icon={Users}         color="text-amber-700"   bg="bg-amber-50" />
            <KPIPill label="ສຳເລັດ"            value={totalDone.toLocaleString()}      icon={CheckCircle2}  color="text-[hsl(0,66%,42%)]" bg="bg-red-50" />
          </div>

          {/* ─── Renewals by Staff ─── */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              <h2 className="font-bold text-foreground text-sm">ການຕໍ່ສັນຍາຕາມພະນັກງານ</h2>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">{sel.label}</span>
            </div>
            {payList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ຍັງບໍ່ມີຂໍ້ມູນການຕໍ່ສັນຍາ</p>
            ) : (
              <div className="space-y-3">
                {payList.map((p, i) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Star size={11} className="text-amber-500 fill-amber-500" />}
                        <span className="font-semibold text-foreground truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{p.count} ລາຍ</span>
                        <span className="font-black text-emerald-700">{p.amount.toLocaleString()} ກີບ</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${maxCount > 0 ? Math.round((p.count / maxCount) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Follow-up by Staff ─── */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <PhoneCall size={16} className="text-blue-600" />
              <h2 className="font-bold text-foreground text-sm">ການຕິດຕາມຕາມພະນັກງານ</h2>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">ທຸກເວລາ</span>
            </div>
            {followList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ຍັງບໍ່ມີຂໍ້ມູນການຕິດຕາມ</p>
            ) : (
              <div className="space-y-4">
                {followList.map((f, i) => (
                  <div key={f.name} className="border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Star size={11} className="text-amber-500 fill-amber-500" />}
                        <span className="font-bold text-foreground text-sm">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{f.rate}% ສຳເລັດ</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="bg-muted rounded-lg py-1.5">
                        <div className="font-black text-foreground">{f.total}</div>
                        <div className="text-muted-foreground">ທັງໝົດ</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg py-1.5">
                        <div className="font-black text-emerald-700">{f.completed}</div>
                        <div className="text-emerald-600">ສຳເລັດ</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg py-1.5">
                        <div className="font-black text-amber-700">{f.inProgress}</div>
                        <div className="text-amber-600">ກຳລັງຕິດຕາມ</div>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${f.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
