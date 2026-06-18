// ════════════════════════════════════════════════════════════════
// ExpiryCalculator.jsx
// ຄຳນວນວັນໝົດອາຍຸ + ອັບເດດ expiry_date ຕາມ User ID
// ─── ສູດ: days = floor(ເງິນ ÷ ລາຄາ/ວັນ) + TODAY
// ════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef } from "react";
import { addDays, format, differenceInDays } from "date-fns";
import {
  CalendarClock, Wallet, ChevronRight,
  Search, CheckCircle2, AlertCircle, Loader2, User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase, customerFromDb } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { CUSTOMERS_KEY } from "@/lib/store/customers";

// ─── ລາຄາ/ວັນ ຕາມແພັກເກດ ────────────────────────────────────
const PACKAGES = [
  { value: 1,  label: "1 ເດືອນ",  rate: 16_833.33 },
  { value: 4,  label: "4 ເດືອນ",  rate: 5_500 },
  { value: 8,  label: "8 ເດືອນ",  rate: 5_500 },
  { value: 16, label: "16 ເດືອນ", rate: 5_500 },
];

function parseNum(s) { return parseFloat(String(s).replace(/,/g, "")) || 0; }
function fmtNum(n)   { return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }); }

export default function ExpiryCalculator() {
  const qc = useQueryClient();

  // ─── calculator state ───────────────────────────────────────
  const [raw, setRaw] = useState("");
  const [pkg, setPkg] = useState(4);

  // ─── user-id lookup state ───────────────────────────────────
  const [userId, setUserId]         = useState("");
  const [customer, setCustomer]     = useState(null);
  const [lookupState, setLookupState] = useState("idle"); // idle | loading | found | notfound | error
  const [applyState, setApplyState] = useState("idle");   // idle | loading | done | error
  const userIdRef = useRef(null);

  // ─── calculation ────────────────────────────────────────────
  const balance    = parseNum(raw);
  const selected   = PACKAGES.find(p => p.value === pkg);
  const days       = balance > 0 ? Math.floor(balance / selected.rate) : 0;
  const expiryDate = days > 0 ? addDays(new Date(), days) : null;
  const today      = format(new Date(), "dd/MM/yyyy");

  const urgency = useMemo(() => {
    if (!expiryDate) return null;
    const d = differenceInDays(expiryDate, new Date());
    if (d < 0)   return { label: "ໝົດອາຍຸແລ້ວ",   cls: "text-red-600 bg-red-50 border-red-200" };
    if (d <= 30) return { label: `ເຫຼືອ ${d} ວັນ`, cls: "text-amber-600 bg-amber-50 border-amber-200" };
    return         { label: `ເຫຼືອ ${d} ວັນ`,       cls: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  }, [expiryDate]);

  // ─── balance input ──────────────────────────────────────────
  function handleChange(e) {
    const v = e.target.value.replace(/,/g, "").replace(/[^\d]/g, "");
    setRaw(v ? fmtNum(v) : "");
    setApplyState("idle");
  }

  // ─── lookup customer by account_id ─────────────────────────
  async function lookup() {
    const id = userId.trim();
    if (!id) return;
    setLookupState("loading");
    setCustomer(null);
    setApplyState("idle");
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("account_id", id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setLookupState("notfound"); return; }
      setCustomer(customerFromDb(data));
      setLookupState("found");
    } catch {
      setLookupState("error");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") lookup();
  }

  // ─── apply: update expiry_date in Supabase ──────────────────
  async function applyExpiry() {
    if (!customer || !expiryDate) return;
    setApplyState("loading");
    try {
      const newExpiry = format(expiryDate, "yyyy-MM-dd");
      const { error } = await supabase
        .from("customers")
        .update({ expiry_date: newExpiry })
        .eq("id", customer.id);
      if (error) throw error;
      setCustomer(prev => ({ ...prev, expiryDate: newExpiry }));
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      setApplyState("done");
    } catch {
      setApplyState("error");
    }
  }

  const canApply = customer && expiryDate && applyState !== "done";

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">

      {/* ─── Header ─── */}
      <div
        className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, hsl(0,72%,36%) 0%, hsl(0,60%,30%) 100%)" }}
      >
        <CalendarClock size={20} className="text-white/80" strokeWidth={2} />
        <div>
          <h1 className="text-white font-bold text-[15px] leading-tight">ຄຳນວນວັນໝົດອາຍຸ</h1>
          <p className="text-white/55 text-[11px]">TODAY: {today}</p>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 flex items-start justify-center p-5">
        <div className="w-full max-w-sm space-y-4">

          {/* ── User ID lookup card ── */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                User ID (Account ID)
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[hsl(0,66%,42%)] focus-within:bg-white transition-colors">
                  <User size={14} className="text-slate-400 flex-shrink-0" />
                  <input
                    ref={userIdRef}
                    type="text"
                    value={userId}
                    onChange={e => { setUserId(e.target.value); setLookupState("idle"); setCustomer(null); setApplyState("idle"); }}
                    onKeyDown={handleKeyDown}
                    placeholder="ໃສ່ ID ແລ້ວກົດ Enter..."
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <button
                  onClick={lookup}
                  disabled={!userId.trim() || lookupState === "loading"}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    userId.trim()
                      ? "bg-[hsl(0,66%,42%)] text-white hover:bg-[hsl(0,72%,36%)] shadow-sm"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  )}
                >
                  {lookupState === "loading"
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Search size={15} />}
                </button>
              </div>
            </div>

            {/* lookup result */}
            <AnimatePresence mode="wait">
              {lookupState === "found" && customer && (
                <motion.div
                  key="found"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-4 mb-3.5 mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-slate-700">{customer.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{customer.accountId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>ສະຖານະ: <span className={cn("font-medium", customer.status === "active" ? "text-emerald-600" : "text-red-500")}>{customer.status}</span></span>
                      <span>·</span>
                      <span>ໝົດອາຍຸ: <span className="font-medium text-slate-700">{customer.expiryDate ?? "—"}</span></span>
                    </div>
                  </div>
                </motion.div>
              )}
              {lookupState === "notfound" && (
                <motion.div key="nf" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mx-4 mb-3.5 mt-2 flex items-center gap-2 text-amber-600 text-[12px] font-medium">
                    <AlertCircle size={13} /> ບໍ່ພົບລູກຄ້ານີ້
                  </div>
                </motion.div>
              )}
              {lookupState === "error" && (
                <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mx-4 mb-3.5 mt-2 flex items-center gap-2 text-red-600 text-[12px] font-medium">
                    <AlertCircle size={13} /> ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Balance input ── */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Wallet size={17} className="text-slate-500" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  ເງິນທີ່ເຫຼືອ (ກີບ)
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={raw}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-300 placeholder:font-normal"
                />
              </div>
              {raw && (
                <button
                  onClick={() => { setRaw(""); setApplyState("idle"); }}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors text-[11px] font-bold flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ── Package selector ── */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200/80 p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">ເລືອກແພັກເກດ</p>
            <div className="grid grid-cols-2 gap-2">
              {PACKAGES.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPkg(p.value); setApplyState("idle"); }}
                  className={cn(
                    "relative flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-xl border-2 transition-all duration-200 text-left",
                    pkg === p.value
                      ? "border-[hsl(0,66%,42%)] bg-red-50/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {pkg === p.value && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[hsl(0,66%,42%)] flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">✓</span>
                    </span>
                  )}
                  <span className={cn("text-[13px] font-bold", pkg === p.value ? "text-[hsl(0,66%,42%)]" : "text-slate-700")}>
                    {p.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {p.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} ກີບ/ວັນ
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Result card ── */}
          <AnimatePresence mode="wait">
            {expiryDate ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="rounded-2xl overflow-hidden shadow-sm border border-slate-200/80"
                style={{ background: "linear-gradient(135deg, hsl(0,72%,36%) 0%, hsl(0,60%,30%) 100%)" }}
              >
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">ວັນໝົດອາຍຸ</p>
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", urgency?.cls)}>
                      {urgency?.label}
                    </span>
                  </div>

                  <div className="text-white font-bold text-4xl tracking-tight mb-1">
                    {format(expiryDate, "dd/MM/yyyy")}
                  </div>
                  <div className="text-white/50 text-[12px] mt-1">
                    ນັບຈາກ TODAY + {days.toLocaleString("en-US")} ວັນ
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">ເງິນ</p>
                      <p className="text-white font-semibold text-sm">{fmtNum(balance)} ກີບ</p>
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">ລາຄາ/ວັນ</p>
                      <p className="text-white font-semibold text-sm">{selected.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                    <div className="text-right">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">ຈຳນວນວັນ</p>
                      <p className="text-white font-semibold text-sm">{days.toLocaleString("en-US")} ວັນ</p>
                    </div>
                  </div>

                  {/* ── Apply button ── */}
                  <AnimatePresence mode="wait">
                    {customer && (
                      <motion.div
                        key="apply-area"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        {applyState === "done" ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-emerald-300 text-sm font-semibold">
                            <CheckCircle2 size={16} />
                            ອັບເດດ expiry_date ສຳເລັດແລ້ວ!
                          </div>
                        ) : (
                          <button
                            onClick={applyExpiry}
                            disabled={!canApply || applyState === "loading"}
                            className={cn(
                              "w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2",
                              canApply
                                ? "bg-white text-[hsl(0,66%,42%)] hover:bg-slate-100 shadow-sm"
                                : "bg-white/20 text-white/40 cursor-not-allowed"
                            )}
                          >
                            {applyState === "loading"
                              ? <><Loader2 size={15} className="animate-spin" /> ກຳລັງອັບເດດ...</>
                              : applyState === "error"
                              ? <><AlertCircle size={15} /> ຜິດພາດ ລອງໃໝ່</>
                              : <>
                                  <CheckCircle2 size={15} />
                                  ອັບເດດວັນໝົດອາຍຸໃຫ້ {customer.name}
                                </>
                            }
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center py-10 gap-2"
              >
                <CalendarClock size={32} className="text-slate-300" strokeWidth={1.5} />
                <p className="text-slate-400 text-sm font-medium">ໃສ່ຈຳນວນເງິນເພື່ອຄຳນວນ</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Rate reference ── */}
          <div className="rounded-2xl bg-white/70 border border-slate-200/60 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">ອ້າງອີງລາຄາ/ວັນ</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {PACKAGES.map(p => (
                <div key={p.value} className="flex items-center justify-between">
                  <span className={cn("text-[11px] font-semibold", pkg === p.value ? "text-[hsl(0,66%,42%)]" : "text-slate-500")}>
                    {p.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {p.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
