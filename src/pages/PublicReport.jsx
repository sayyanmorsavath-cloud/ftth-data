import { useState, useEffect, useRef } from "react";
import { supabase, customerFromDb, ticketToDb } from "@/lib/supabase";
import { genTicketNumber } from "@/lib/store/db";
import { Wifi, Search, X, CheckCircle2, ChevronRight, Zap, Wrench, RefreshCw, HelpCircle, AlertCircle, Phone, MessageCircle } from "lucide-react";

const CATEGORIES = [
  { value: "ອິນເຕີເນັດຊ້າ", icon: Zap, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", activeBg: "bg-amber-500" },
  { value: "ອິນເຕີເນັດຂາດ", icon: Wifi, color: "text-red-500", bg: "bg-red-50 border-red-200", activeBg: "bg-red-500" },
  { value: "ອຸປະກອນຂັດຂ້ອງ", icon: Wrench, color: "text-orange-500", bg: "bg-orange-50 border-orange-200", activeBg: "bg-orange-500" },
  { value: "ຂໍຕໍ່ອາຍຸ", icon: RefreshCw, color: "text-blue-500", bg: "bg-blue-50 border-blue-200", activeBg: "bg-blue-500" },
  { value: "ອື່ນໆ", icon: HelpCircle, color: "text-slate-500", bg: "bg-slate-50 border-slate-200", activeBg: "bg-slate-500" },
];

const CONTACT_METHODS = [
  { value: "ໂທລະສັບ", icon: Phone },
  { value: "WhatsApp", icon: MessageCircle },
  { value: "ມາດ້ວຍຕົນເອງ", icon: CheckCircle2 },
  { value: "ອື່ນໆ", icon: HelpCircle },
];

async function sendTelegramAlert(ticketData) {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  const msg =
    `⚠️⚠️ ແຈ້ງຕິດຄັດ (ພະນັກງານ) ⚠️⚠️\n` +
    `ຊື່ : ${ticketData.customerName || "-"}\n` +
    `ທີ່ຢູ່ : ${ticketData.customerAddress || "-"}\n` +
    `ເບີໂທຕິດຕໍ່ : ${ticketData.customerPhone || "-"}\n` +
    `ເບີຕິດຄັດ : ${ticketData.customerAccountId || "-"}\n` +
    `ໝວດຫມູ່ : ${ticketData.category || "-"}\n` +
    `ລາຍລະອຽດ : ${ticketData.description || "-"}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg }),
    });
  } catch (e) {
    console.error("Telegram alert failed", e);
  }
}

export default function PublicReport() {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState("ອິນເຕີເນັດຊ້າ");
  const [contactMethod, setContactMethod] = useState("ໂທລະສັບ");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) { setCustomers([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const s = search.trim().replace(/'/g, "''");
      const { data } = await supabase
        .from("customers")
        .select("*")
        .or(`name.ilike.%${s}%,phone.ilike.%${s}%,account_id.ilike.%${s}%,address.ilike.%${s}%`)
        .order("name")
        .limit(15);
      setCustomers((data ?? []).map(customerFromDb));
      setSearching(false);
    }, 300);
  }, [search]);

  const handleSelect = (c) => {
    setSelected(c);
    setStep(2);
    setSearch("");
    setCustomers([]);
  };

  const handleSubmit = async () => {
    if (!selected || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const ticketData = {
        customerId: selected.id,
        customerName: selected.name,
        customerPhone: selected.phone,
        customerAccountId: selected.accountId,
        customerAddress: selected.address,
        customerSpeed: selected.speed,
        customerStatus: selected.status,
        customerExpiry: selected.expiryDate,
        category,
        priority: "normal",
        description: description.trim(),
        contactMethod,
        reportedAt: new Date().toISOString().slice(0, 10),
        ticketNumber: genTicketNumber(),
        status: "open",
      };
      const row = ticketToDb(ticketData);
      const { error: err } = await supabase.from("tickets").insert(row);
      if (err) throw err;
      await sendTelegramAlert(ticketData);
      setDone(true);
    } catch (e) {
      setError("ເກີດຂໍ້ຜິດພາດ: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelected(null);
    setCategory("ອິນເຕີເນັດຊ້າ");
    setContactMethod("ໂທລະສັບ");
    setDescription("");
    setDone(null);
    setError("");
    setSearch("");
    setCustomers([]);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[hsl(0,66%,20%)] to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={42} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">ແຈ້ງສຳເລັດ!</h2>
              <p className="text-slate-500 text-sm mt-1">ລະບົບໄດ້ຮັບການແຈ້ງຂອງທ່ານແລ້ວ<br />ທີມງານຈະດຳເນີນການໂດຍໄວ</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ລູກຄ້າ</span>
                <span className="font-semibold text-slate-800">{selected?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ໝວດໝູ່</span>
                <span className="font-semibold text-slate-800">{category}</span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-2xl bg-[hsl(0,66%,42%)] text-white font-bold text-sm hover:bg-[hsl(0,66%,35%)] transition-colors"
            >
              ແຈ້ງໃໝ່ອີກຄັ້ງ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[hsl(0,66%,20%)] to-slate-900 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto backdrop-blur-sm border border-white/20">
            <Wifi size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ແຈ້ງ WiFi ຕິດຄັດ</h1>
          <p className="text-white/50 text-sm">ສຳລັບພະນັກງານ — ຄົ້ນຫາລູກຄ້າ ແລ້ວກົດແຈ້ງໄດ້ເລີຍ</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s ? "bg-white text-[hsl(0,66%,42%)]" : "bg-white/15 text-white/40"
              }`}>
                {step > s ? <CheckCircle2 size={14} /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 rounded-full ${step > s ? "bg-white" : "bg-white/20"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Step 1: Search customer */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base">ຂັ້ນຕອນ 1 — ຄົ້ນຫາລູກຄ້າ</h2>
                <p className="text-slate-400 text-xs mt-0.5">ພິມຊື່, ເບີໂທ ຫຼື ເລກ Account</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ຄົ້ນຫາລູກຄ້າ..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-[hsl(0,66%,42%)] focus:bg-white transition-all placeholder:text-slate-400"
                />
                {search && (
                  <button onClick={() => { setSearch(""); setCustomers([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="min-h-[180px]">
                {!search.trim() && (
                  <div className="flex flex-col items-center justify-center h-44 text-slate-400 space-y-2">
                    <Search size={32} className="opacity-30" />
                    <p className="text-sm">ພິມເພື່ອຄົ້ນຫາລູກຄ້າ</p>
                  </div>
                )}
                {searching && (
                  <div className="flex items-center justify-center h-44 gap-2 text-slate-400 text-sm">
                    <div className="w-4 h-4 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
                    ກຳລັງຄົ້ນຫາ...
                  </div>
                )}
                {!searching && search.trim() && customers.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-44 text-slate-400 space-y-1">
                    <AlertCircle size={28} className="opacity-40" />
                    <p className="text-sm">ບໍ່ພົບລູກຄ້າ</p>
                  </div>
                )}
                {!searching && customers.length > 0 && (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                    {customers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect(c)}
                        className="w-full text-left px-4 py-3 rounded-2xl border-2 border-slate-100 hover:border-[hsl(0,66%,42%)] hover:bg-red-50/50 transition-all group flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-[hsl(0,66%,42%)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {c.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-sm truncate">{c.name}</div>
                          <div className="text-xs text-slate-400 truncate">{c.phone} · {c.speed} · {c.accountId}</div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[hsl(0,66%,42%)] flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Fill details */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-bold text-slate-800 text-base">ຂັ້ນຕອນ 2 — ລາຍລະອຽດບັນຫາ</h2>
                <p className="text-slate-400 text-xs mt-0.5">ເລືອກປະເພດ ແລ້ວອະທິບາຍບັນຫາ</p>
              </div>

              {/* Selected customer chip */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
                <div className="w-9 h-9 rounded-full bg-[hsl(0,66%,42%)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {selected?.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{selected?.name}</div>
                  <div className="text-xs text-slate-400 truncate">{selected?.phone} · {selected?.accountId}</div>
                </div>
                <button onClick={() => setStep(1)} className="text-xs text-[hsl(0,66%,42%)] font-semibold hover:underline flex-shrink-0">
                  ປ່ຽນ
                </button>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ປະເພດບັນຫາ</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const active = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all ${
                          active
                            ? "border-[hsl(0,66%,42%)] bg-red-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-[hsl(0,66%,42%)]" : "bg-white border border-slate-200"}`}>
                          <Icon size={15} className={active ? "text-white" : cat.color} />
                        </div>
                        <span className={`text-xs font-semibold leading-tight ${active ? "text-[hsl(0,66%,42%)]" : "text-slate-600"}`}>
                          {cat.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact method */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ຊ່ອງທາງຕິດຕໍ່</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTACT_METHODS.map(m => {
                    const Icon = m.icon;
                    const active = contactMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setContactMethod(m.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                          active
                            ? "border-[hsl(0,66%,42%)] bg-red-50 text-[hsl(0,66%,42%)] font-semibold"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <Icon size={14} className={active ? "text-[hsl(0,66%,42%)]" : "text-slate-400"} />
                        {m.value}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ລາຍລະອຽດ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="ອະທິບາຍບັນຫາທີ່ພົບ..."
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] focus:bg-white transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm border border-red-200">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ກັບ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!description.trim() || submitting}
                  className="flex-1 py-3 rounded-2xl bg-[hsl(0,66%,42%)] text-white font-bold text-sm hover:bg-[hsl(0,66%,35%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> ກຳລັງສົ່ງ...</>
                  ) : (
                    <><Wifi size={15} /> ສົ່ງການແຈ້ງ</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs">FTTH WiFi Management System</p>
      </div>
    </div>
  );
}
