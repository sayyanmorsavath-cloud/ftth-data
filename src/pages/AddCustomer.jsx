import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateCustomer, getListCustomersQueryKey } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserPlus, ChevronRight, CheckCircle2, AlertCircle, Star, Gift, Zap, Tag } from "lucide-react";
import { parse, isValid, format, addMonths, subDays } from "date-fns";
import { DateInput, isoToDisplay } from "@/components/DateInput";
import { CUSTOMER_TYPES as CUST_TYPE_LIST } from "@/lib/customerTypes";
import { getPrice, formatPrice, TOTAL_TO_PAID } from "@/lib/pricing";

const steps = ["ຂໍ້ມູນລູກຄ້າ", "ຕິດຕາມ & ໝາຍເຫດ"];

const CUSTOMER_TYPES = CUST_TYPE_LIST;
const FOLLOW_UP_STATUSES = ["", "ຕ້ອງຕິດຕາມ", "ກຳລັງຕິດຕາມ", "ຕິດຕາມແລ້ວ", "ສຳເລັດ"];

const SPEED_OPTIONS = [
  "35 Mbps", "55 Mbps", "70 Mbps", "80 Mbps",
  "100 Mbps", "120 Mbps", "160 Mbps", "170 Mbps",
  "180 Mbps", "300 Mbps", "320 Mbps", "400 Mbps", "420 Mbps", "480 Mbps",
];

const DURATION_OPTIONS = [
  { label: "1 ເດືອນ", totalMonths: 1, paid: 1, bonus: 0 },
  { label: "3 ເດືອນ", sub: "ແຖມ 1 ເດືອນ", totalMonths: 4, paid: 3, bonus: 1 },
  { label: "6 ເດືອນ", sub: "ແຖມ 2 ເດືອນ", totalMonths: 8, paid: 6, bonus: 2 },
  { label: "12 ເດືອນ", sub: "ແຖມ 4 ເດືອນ", totalMonths: 16, paid: 12, bonus: 4 },
];

function displayToDate(val) {
  if (!val) return null;
  const d = parse(val, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}

function calcExpiry(startStr, totalMonths) {
  const d = displayToDate(startStr);
  if (!d || totalMonths <= 0) return "";
  return format(subDays(addMonths(d, totalMonths), 1), "dd/MM/yyyy");
}

const defaultForm = {
  accountId: "",
  name: "",
  phone: "",
  address: "",
  city: "",
  customerType: "IN",
  vip: false,
  speed: "",
  status: "active",
  installationDate: "",
  startDate: "",
  expiryDate: "",
  duration: 0,
  bonusMonthUsed: false,
  followUpStatus: "",
  followUpPerson: "",
  remarks: "",
};

function ErrMsg({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-[11px] mt-0.5 font-medium">{msg}</p>;
}

export default function AddCustomer() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState({});
  const createMutation = useCreateCustomer();
  const [form, setForm] = useState(defaultForm);
  const [phoneDup, setPhoneDup] = useState(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const checkPhoneDup = useCallback(async (phone) => {
    const parts = phone.split("/").map(p => p.trim().replace(/\s/g, "")).filter(p => p.length >= 8);
    if (parts.length === 0) { setPhoneDup(null); return; }
    setCheckingPhone(true);
    let found = null;
    for (const p of parts) {
      const { data } = await supabase.from("customers").select("id,name,status").eq("phone", p).limit(1);
      if (data?.[0]) { found = data[0]; break; }
    }
    setPhoneDup(found);
    setCheckingPhone(false);
  }, []);

  const set = (k, v) => {
    setForm((f) => {
      const updated = { ...f, [k]: v };
      if ((k === "startDate" || k === "duration") && updated.duration > 0) {
        const sd = k === "startDate" ? v : updated.startDate;
        const expiry = calcExpiry(sd, updated.duration);
        if (expiry) updated.expiryDate = expiry;
      }
      return updated;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const setDuration = (totalMonths) => {
    setForm((f) => {
      const expiry = f.startDate ? calcExpiry(f.startDate, totalMonths) : f.expiryDate;
      return { ...f, duration: totalMonths, expiryDate: expiry || f.expiryDate };
    });
    setErrors((e) => ({ ...e, expiryDate: undefined }));
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "ກະລຸນາໃສ່ຊື່";
    if (!form.phone.trim() || !form.phone.split("/").every(p => /^\d+$/.test(p.trim().replace(/\s/g, "")) && p.trim().length > 0))
      errs.phone = "ເບີໂທບໍ່ຖືກຕ້ອງ (ຕົວເລກ, ຄັ່ນດ້ວຍ / ຖ້າຫຼາຍເບີ)";
    if (!form.speed) errs.speed = "ກະລຸນາເລືອກຄວາມໄວ";
    if (!form.startDate || !displayToDate(form.startDate))
      errs.startDate = "ກະລຸນາໃສ່ວັນເລີ່ມໃຊ້ (DD/MM/YYYY)";
    if (!form.expiryDate || !displayToDate(form.expiryDate))
      errs.expiryDate = "ກະລຸນາເລືອກໄລຍະ ຫຼື ໃສ່ວັນໝົດ";
    return errs;
  };

  const handleNext = () => {
    if (step === 0) {
      const errs = validateStep0();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    setErrors({});
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const startDate = displayToDate(form.startDate);
    const expiryDate = displayToDate(form.expiryDate);
    const installationDate = form.installationDate ? displayToDate(form.installationDate) : null;
    if (!startDate || !expiryDate) { setSubmitError("ຮູບແບບວັນທີຜິດ"); return; }
    if (!form.speed) { setSubmitError("ກະລຸນາເລືອກຄວາມໄວ"); return; }
    try {
      const created = await createMutation.mutateAsync({
        data: {
          accountId: form.accountId || undefined,
          name: form.name,
          phone: form.phone,
          address: form.address || "—",
          city: form.city || undefined,
          customerType: form.customerType,
          vip: form.vip,
          speed: form.speed,
          status: form.status,
          installationDate: installationDate ? format(installationDate, "yyyy-MM-dd") : undefined,
          startDate: format(startDate, "yyyy-MM-dd"),
          expiryDate: format(expiryDate, "yyyy-MM-dd"),
          bonusMonthUsed: form.bonusMonthUsed,
          followUpStatus: form.followUpStatus || undefined,
          followUpPerson: form.followUpPerson || undefined,
          remarks: form.remarks || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      setCreatedId(created?.id ?? null);
      setSuccess(true);
    } catch (err) {
      const msg = err?.message ?? "";
      if (msg.includes("23505") || msg.toLowerCase().includes("duplicate")) {
        setSubmitError("ລະຫັດລູກຄ້ານີ້ຖືກໃຊ້ແລ້ວ ກະລຸນາໃຊ້ລະຫັດໃໝ່");
      } else if (msg.includes("violates") || msg.includes("null value")) {
        setSubmitError(`ຂໍ້ມູນບໍ່ຄົບ: ${msg}`);
      } else if (msg) {
        setSubmitError(`ຜິດພາດ: ${msg}`);
      } else {
        setSubmitError("ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່");
      }
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setStep(0);
    setErrors({});
    setSubmitError("");
    setForm(defaultForm);
  };

  if (success) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">ສຳເລັດແລ້ວ!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            ເພີ່ມລູກຄ້າ <strong>{form.name}</strong> ສຳເລັດແລ້ວ
          </p>
          <div className="flex flex-col gap-2">
            {createdId && (
              <button
                onClick={() => setLocation(`/customers/${createdId}`)}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Star size={14} /> ເບິ່ງຂໍ້ມູນລູກຄ້າ
              </button>
            )}
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                ເພີ່ມໃໝ່
              </button>
              <button onClick={() => setLocation("/customers")} className="flex-1 py-2 rounded-lg bg-[hsl(0,66%,42%)] text-white text-sm font-medium hover:bg-[hsl(0,66%,36%)] transition-colors">
                ໄປທີ່ລາຍຊື່
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div
        className="rounded-2xl p-5 flex items-center gap-4 shadow-md"
        style={{ background: "linear-gradient(135deg, hsl(0,66%,30%) 0%, hsl(0,66%,44%) 60%, hsl(0,60%,54%) 100%)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
          <UserPlus size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white tracking-wide">ເພີ່ມລູກຄ້າໃໝ່</h1>
          <p className="text-sm text-white/75 mt-0.5">ຂັ້ນຕອນ {step + 1} / {steps.length} — {steps[step]}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[11px] text-white/60 uppercase tracking-widest font-semibold">FTTH System</div>
          <div className="text-xs text-white/80 mt-0.5">ລະບຸລຸ້ມຖວຍ WiFi</div>
        </div>
      </div>

      <div className="flex items-center gap-0 px-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm ${
                i < step
                  ? "bg-emerald-500 text-white ring-2 ring-emerald-200"
                  : i === step
                    ? "bg-[hsl(0,66%,42%)] text-white ring-2 ring-[hsl(0,66%,80%)]"
                    : "bg-muted text-muted-foreground border-2 border-border"
              }`}>
                {i < step ? <CheckCircle2 size={17} /> : i + 1}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${i === step ? "text-[hsl(0,66%,42%)]" : i < step ? "text-emerald-600" : "text-muted-foreground"}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${i < step ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border-2 border-[hsl(0,66%,88%)] shadow-md overflow-hidden">

        {step === 0 && (
          <div className="p-6 space-y-6">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 rounded-full bg-[hsl(0,66%,42%)]" />
                <p className="text-[11px] font-bold text-[hsl(0,66%,42%)] uppercase tracking-widest">ຂໍ້ມູນສ່ວນຕົວ</p>
                <div className="flex-1 h-px bg-[hsl(0,66%,90%)]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">
                    ຊື່ ແລະ ນາມສະກຸນ <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background ${errors.name ? "border-red-400" : "border-border"}`}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="ທ. / ນາງ ..."
                  />
                  <ErrMsg msg={errors.name} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">Account ID</label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-muted text-sm font-mono font-bold text-[hsl(0,66%,42%)] select-none">
                      81fh
                    </span>
                    <input
                      className="flex-1 min-w-0 border border-border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background font-mono"
                      value={form.accountId.replace(/^81fh/, "")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/^81fh/i, "");
                        set("accountId", raw ? `81fh${raw}` : "");
                      }}
                      placeholder="212397"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ຕົວຢ່າງ: ໃສ່ 212397 → ໄດ້ 81fh212397</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">
                    ເບີໂທ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background ${errors.phone ? "border-red-400" : phoneDup ? "border-amber-400" : "border-border"}`}
                      value={form.phone}
                      onChange={(e) => { set("phone", e.target.value); setPhoneDup(null); }}
                      onBlur={(e) => checkPhoneDup(e.target.value)}
                      placeholder="020XXXXXXXX ຫຼື 020XXX/030XXX"
                      inputMode="tel"
                    />
                    {checkingPhone && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <ErrMsg msg={errors.phone} />
                  {phoneDup && !errors.phone && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
                      <AlertCircle size={12} className="flex-shrink-0" />
                      ເບີໂທນີ້ຖືກໃຊ້ຢູ່ແລ້ວ: <strong>{phoneDup.name}</strong>
                      {phoneDup.status === "expired" && <span className="ml-auto text-red-600 font-bold">(ໝົດອາຍຸ)</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ປະເພດລູກຄ້າ</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                    value={form.customerType}
                    onChange={(e) => set("customerType", e.target.value)}
                  >
                    {CUSTOMER_TYPES.map((t) => <option key={t.code} value={t.code}>{t.emoji} {t.code} – {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ສະຖານະ</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="active">ໃຊ້ງານ</option>
                    <option value="inactive">ບໍ່ໃຊ້ງານ</option>
                    <option value="suspended">ຖືກລະງັບ</option>
                    <option value="expired">ໝົດອາຍຸ</option>
                  </select>
                </div>
                {(() => {
                  const expiryD = form.expiryDate ? displayToDate(form.expiryDate) : null;
                  if (!expiryD || expiryD >= new Date() || form.status === "expired") return null;
                  return (
                    <div className="sm:col-span-2 flex items-center gap-2.5 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                      <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                      <span className="flex-1 text-xs text-red-700">
                        ວັນໝົດ <strong>{form.expiryDate}</strong> ໄດ້ຜ່ານໄປແລ້ວ — ສະຖານະຄວນຕັ້ງເປັນ <strong>ໝົດອາຍຸ</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => set("status", "expired")}
                        className="text-xs font-bold bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                      >
                        ຕັ້ງເປັນ ໝົດອາຍຸ
                      </button>
                    </div>
                  );
                })()}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ທີ່ຢູ່</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ເມືອງ/ແຂວງ</label>
                  <input
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="ໄຊ, ອຸດົມໄຊ..."
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">VIP</label>
                  <button
                    type="button"
                    onClick={() => set("vip", !form.vip)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.vip
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-border text-muted-foreground hover:border-amber-300"
                    }`}
                  >
                    <Star size={13} className={form.vip ? "fill-amber-400 text-amber-400" : ""} />
                    {form.vip ? "VIP" : "ປົກກະຕິ"}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 rounded-full bg-amber-500" />
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">ຄວາມໄວອິນເຕີເນັດ (Speed) <span className="text-red-500">*</span></p>
                <div className="flex-1 h-px bg-amber-100" />
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Zap size={15} className="text-muted-foreground" />
                </div>
                <select
                  className={`w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background appearance-none ${
                    errors.speed ? "border-red-400" : form.speed ? "border-[hsl(0,66%,42%)]" : "border-border"
                  }`}
                  value={form.speed}
                  onChange={(e) => set("speed", e.target.value)}
                >
                  <option value="">— ເລືອກຄວາມໄວ —</option>
                  {SPEED_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {form.speed && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[hsl(0,66%,42%)] font-medium">
                  <Zap size={13} className="fill-[hsl(0,66%,42%)]" />
                  ເລືອກ: {form.speed}
                </div>
              )}
              <ErrMsg msg={errors.speed} />
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 rounded-full bg-blue-500" />
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">ວັນທີ &amp; ໄລຍະການໃຊ້ງານ</p>
                <div className="flex-1 h-px bg-blue-100" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">
                      ວັນເລີ່ມໃຊ້ <span className="text-red-500">*</span>
                    </label>
                    <DateInput value={form.startDate} onChange={(v) => set("startDate", v)} error={!!errors.startDate} />
                    <ErrMsg msg={errors.startDate} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">ວັນຕິດຕັ້ງ</label>
                    <DateInput value={form.installationDate} onChange={(v) => set("installationDate", v)} placeholder="DD/MM/YYYY (ຖ້າມີ)" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ໄລຍະການຊື້</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DURATION_OPTIONS.map((opt) => {
                      const paidM = TOTAL_TO_PAID[opt.totalMonths];
                      const price = getPrice(form.speed, paidM);
                      const isSelected = form.duration === opt.totalMonths;
                      return (
                        <button
                          key={opt.totalMonths}
                          type="button"
                          onClick={() => setDuration(opt.totalMonths)}
                          className={`border-2 rounded-xl p-3 text-center transition-all ${
                            isSelected
                              ? "border-[hsl(0,66%,42%)] bg-[hsl(0,66%,97%)]"
                              : "border-border hover:border-[hsl(0,66%,70%)]"
                          }`}
                        >
                          <div className="font-bold text-sm text-foreground">{opt.label}</div>
                          {opt.bonus > 0 && (
                            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center justify-center gap-0.5">
                              <Gift size={9} strokeWidth={2.5} /> {opt.sub}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">{opt.totalMonths} ເດືອນລວມ</div>
                          {price != null && (
                            <div className={`text-[11px] font-extrabold mt-1.5 tabular-nums ${isSelected ? "text-[hsl(0,66%,42%)]" : "text-muted-foreground"}`}>
                              {price.toLocaleString("en-US")} ₭
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Price Summary Box ── */}
                  {form.speed && form.duration > 0 && (() => {
                    const paidM = TOTAL_TO_PAID[form.duration];
                    const price = getPrice(form.speed, paidM);
                    if (!price) return null;
                    const opt = DURATION_OPTIONS.find(o => o.totalMonths === form.duration);
                    return (
                      <div className="mt-2 flex items-center gap-3 bg-[hsl(0,66%,97%)] border border-[hsl(0,66%,80%)] rounded-xl px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-[hsl(0,66%,42%)] flex items-center justify-center flex-shrink-0">
                          <Tag size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">ລາຄາທີ່ຕ້ອງຈ່າຍ</div>
                          <div className="font-extrabold text-[hsl(0,66%,42%)] text-lg tabular-nums leading-tight">
                            {price.toLocaleString("en-US")} <span className="text-sm font-bold">ກີບ</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {form.speed} · {opt?.label}{opt?.bonus > 0 ? ` · ແຖມ ${opt.bonus} ເດືອນ` : ""}
                          </div>
                        </div>
                        {opt?.bonus > 0 && (
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1 flex items-center gap-1">
                              <Gift size={10} /> ແຖມ {opt.bonus} ເດືອນ
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wide">
                    ວັນໝົດສັນຍາ <span className="text-red-500">*</span>
                    {form.duration > 0 && form.expiryDate && (
                      <span className="ml-2 text-emerald-600 text-[10px] normal-case font-normal">(ຄຳນວນອັດຕະໂນມັດ)</span>
                    )}
                  </label>
                  <DateInput
                    value={form.expiryDate}
                    onChange={(v) => { set("expiryDate", v); setForm((f) => ({ ...f, duration: 0 })); }}
                    error={!!errors.expiryDate}
                    className={form.duration > 0 && form.expiryDate ? "border-emerald-400 bg-emerald-50/50" : ""}
                  />
                  <ErrMsg msg={errors.expiryDate} />
                </div>
              </div>
            </section>
          </div>
        )}

        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 rounded-full bg-emerald-500" />
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">ຕິດຕາມ &amp; ໝາຍເຫດ</p>
              <div className="flex-1 h-px bg-emerald-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ສະຖານະຕິດຕາມ</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                  value={form.followUpStatus}
                  onChange={(e) => set("followUpStatus", e.target.value)}
                >
                  {FOLLOW_UP_STATUSES.map((s) => <option key={s} value={s}>{s || "— ບໍ່ມີ —"}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ຜູ້ຕິດຕາມ</label>
                <input
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background"
                  value={form.followUpPerson}
                  onChange={(e) => set("followUpPerson", e.target.value)}
                  placeholder="ຊື່ຜູ້ຕິດຕາມ..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">ໝາຍເຫດ</label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background resize-none"
                  rows={4}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-4 py-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">ເດືອນແຖມ</label>
                <button
                  type="button"
                  onClick={() => set("bonusMonthUsed", !form.bonusMonthUsed)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.bonusMonthUsed
                      ? "border-slate-300 bg-slate-100 text-slate-500"
                      : "border-green-400 bg-green-50 text-green-700"
                  }`}
                >
                  <Gift size={14} />
                  {form.bonusMonthUsed ? "ໃຊ້ແລ້ວ" : "ຍັງບໍ່ໃຊ້"}
                </button>
              </div>
            </div>
            <div
              className="rounded-xl p-4 mt-2 border border-[hsl(0,66%,85%)]"
              style={{ background: "linear-gradient(135deg, hsl(0,66%,98%) 0%, hsl(0,30%,97%) 100%)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-[hsl(0,66%,42%)]" />
                <p className="text-[11px] font-bold text-[hsl(0,66%,42%)] uppercase tracking-widest">ສະຫຼຸບຂໍ້ມູນ</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { l: "ຊື່", v: form.name },
                  { l: "ເບີໂທ", v: form.phone },
                  { l: "ຄວາມໄວ", v: form.speed },
                  { l: "ວັນເລີ່ມໃຊ້", v: form.startDate },
                  { l: "ວັນໝົດ", v: form.expiryDate },
                  { l: "ສະຖານະ", v: form.status === "active" ? "ໃຊ້ງານ" : form.status === "inactive" ? "ບໍ່ໃຊ້ງານ" : form.status === "suspended" ? "ຖືກລະງັບ" : "ໝົດອາຍຸ" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{l}</span>
                    <span className="font-semibold text-foreground text-xs">{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            {submitError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg text-sm">
                <AlertCircle size={15} /> {submitError}
              </div>
            )}
          </div>
        )}

        <div
          className="px-6 py-4 border-t-2 border-[hsl(0,66%,90%)] flex justify-between items-center"
          style={{ background: "linear-gradient(to right, hsl(0,66%,99%), hsl(0,10%,98%))" }}
        >
          <button
            onClick={() => step === 0 ? setLocation("/customers") : setStep(step - 1)}
            className="px-5 py-2.5 rounded-lg border-2 border-border text-sm font-semibold hover:bg-muted hover:border-[hsl(0,66%,70%)] transition-all"
          >
            {step === 0 ? "ຍົກເລີກ" : "← ກັບຄືນ"}
          </button>
          {step === 0 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, hsl(0,66%,36%) 0%, hsl(0,66%,48%) 100%)" }}
            >
              ໜ້າຕໍ່ໄປ <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, hsl(145,60%,30%) 0%, hsl(145,60%,42%) 100%)" }}
            >
              <CheckCircle2 size={16} />
              {createMutation.isPending ? "ກຳລັງບັນທຶກ..." : "ຢືນຢັນ ແລະ ບັນທຶກ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
