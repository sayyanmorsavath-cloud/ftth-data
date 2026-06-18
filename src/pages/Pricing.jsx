import { useState } from "react";
import { Tag, Zap, Gift, Info, ChevronDown, ChevronUp } from "lucide-react";
import { PRICING_ROWS } from "@/lib/pricing";

const COLS = [
  { key: "m1",  label: "1 ເດືອນ",  sub: "ຈ່າຍ 1",  bonus: 0  },
  { key: "m3",  label: "3 ເດືອນ",  sub: "+ແຖມ 1",  bonus: 1  },
  { key: "m6",  label: "6 ເດືອນ",  sub: "+ແຖມ 2",  bonus: 2  },
  { key: "m12", label: "12 ເດືອນ", sub: "+ແຖມ 4",  bonus: 4  },
];

function fmt(n) {
  return n.toLocaleString("en-US");
}

function TagBadge({ tag }) {
  if (!tag) return null;
  const cls = tag === "LIVE"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-blue-100 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded-full border ml-1 ${cls}`}>
      {tag}
    </span>
  );
}

export default function Pricing() {
  const [highlight, setHighlight] = useState(null);
  const [showBonus, setShowBonus] = useState(false);

  return (
    <div className="p-3 sm:p-5 space-y-5 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4 shadow-md"
        style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,42%) 55%, hsl(0,55%,54%) 100%)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
          <Tag size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white tracking-wide">ລາຄາແພັກເກດ FTTH</h1>
          <p className="text-sm text-white/75 mt-0.5">ຕາຕະລາງລາຄາ LTC · ຮັດຕາເສັ້ນໃຍແກ້ວ</p>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div className="text-[11px] text-white/60 uppercase tracking-widest font-semibold">LTC FTTH</div>
          <div className="text-xs text-white/80 mt-0.5">ໜ່ວຍ: ກີບ (₭)</div>
        </div>
      </div>

      {/* ── Bonus info banner ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowBonus(b => !b)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <Gift size={16} className="text-emerald-600" />
            ໂບນັດເດືອນຟຣີ — ຊື້ໃຫຍ່ ແຖມໃຫຍ່
          </div>
          {showBonus ? <ChevronUp size={16} className="text-emerald-600" /> : <ChevronDown size={16} className="text-emerald-600" />}
        </button>
        {showBonus && (
          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { paid: "3 ເດືອນ", bonus: "1 ເດືອນ", total: "4 ເດືອນ", color: "bg-emerald-100 border-emerald-200 text-emerald-800" },
              { paid: "6 ເດືອນ", bonus: "2 ເດືອນ", total: "8 ເດືອນ", color: "bg-teal-100 border-teal-200 text-teal-800" },
              { paid: "12 ເດືອນ", bonus: "4 ເດືອນ", total: "16 ເດືອນ", color: "bg-cyan-100 border-cyan-200 text-cyan-800" },
            ].map(b => (
              <div key={b.paid} className={`rounded-xl border p-3 text-center ${b.color}`}>
                <div className="text-xs font-semibold">ຊື້ <span className="font-extrabold text-base">{b.paid}</span></div>
                <div className="text-sm my-0.5">+ ແຖມ <span className="font-extrabold">{b.bonus}</span></div>
                <div className="text-[11px] font-bold opacity-75">ໃຊ້ໄດ້ {b.total}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Speed filter chips ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHighlight(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${highlight === null ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          ທັງໝົດ
        </button>
        {PRICING_ROWS.map(r => (
          <button
            key={r.speed}
            onClick={() => setHighlight(h => h === r.speed ? null : r.speed)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${highlight === r.speed ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            <Zap size={9} /> {r.speed} {r.tag && <span className="opacity-80">({r.tag})</span>}
          </button>
        ))}
      </div>

      {/* ── Pricing Table — Desktop ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(0,66%,42%)] text-white">
                <th className="text-left px-5 py-4 font-bold text-sm w-40">
                  <div className="flex items-center gap-1.5"><Zap size={14} /> ຄວາມໄວ (Mbps)</div>
                </th>
                {COLS.map(c => (
                  <th key={c.key} className="px-4 py-4 text-center font-bold">
                    <div className="text-sm">{c.label}</div>
                    <div className="text-[10px] font-semibold opacity-80 mt-0.5 flex items-center justify-center gap-0.5">
                      {c.bonus > 0 ? (
                        <><Gift size={9} /> {c.sub}</>
                      ) : (
                        <span>{c.sub}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {PRICING_ROWS.map((row, idx) => {
                const isHighlighted = highlight === row.speed;
                const isDimmed = highlight && !isHighlighted;
                return (
                  <tr
                    key={row.speed}
                    onClick={() => setHighlight(h => h === row.speed ? null : row.speed)}
                    className={`cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-[hsl(0,66%,97%)] ring-1 ring-inset ring-[hsl(0,66%,80%)]"
                        : isDimmed
                          ? "opacity-40"
                          : idx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isHighlighted ? "bg-[hsl(0,66%,42%)]" : "bg-muted-foreground/30"}`} />
                        <span className="font-bold text-foreground text-sm">{row.label}</span>
                        <TagBadge tag={row.tag} />
                      </div>
                    </td>
                    {COLS.map(c => (
                      <td key={c.key} className={`px-4 py-3.5 text-center tabular-nums font-mono ${isHighlighted ? "font-extrabold text-[hsl(0,66%,42%)]" : "font-semibold text-foreground"}`}>
                        {fmt(row[c.key])}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">₭</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info size={12} />
            ລາຄາລວມ VAT · ຫົວໜ່ວຍ: ກີບລາວ (₭) · ກົດທີ່ແຖວເພື່ອ highlight
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" /> LIVE = ດູ Content Live
            </span>
            <span className="flex items-center gap-1 text-[11px] text-blue-700 font-semibold">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" /> STEAM = Gaming Package
            </span>
          </div>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="sm:hidden space-y-3">
        {PRICING_ROWS
          .filter(row => !highlight || row.speed === highlight)
          .map((row) => (
            <div key={row.speed} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(0,66%,42%)] text-white">
                <Zap size={14} />
                <span className="font-bold">{row.label}</span>
                {row.tag && (
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{row.tag}</span>
                )}
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-border/60">
                {COLS.map(c => (
                  <div key={c.key} className="px-4 py-3 text-center">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 flex items-center justify-center gap-0.5">
                      {c.label}
                      {c.bonus > 0 && (
                        <span className="text-emerald-600 ml-1 flex items-center gap-0.5">
                          <Gift size={8} /> {c.sub}
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-[hsl(0,66%,42%)] text-base tabular-nums font-mono">
                      {fmt(row[c.key])}
                    </div>
                    <div className="text-[10px] text-muted-foreground">ກີບ</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

    </div>
  );
}
