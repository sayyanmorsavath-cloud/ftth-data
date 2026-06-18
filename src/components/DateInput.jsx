import { CalendarDays, Clock } from "lucide-react";
import { parse, isValid, format } from "date-fns";

// ════════════════════════════════════════════════════════════════
// DateInput.jsx
// ສ່ວນປ້ອນວັນທີ ແລະ ເວລາ — ໃຊ້ native inputs ແຕ່ bypass showPicker()
// ════════════════════════════════════════════════════════════════

// ─── ຊ່ວຍ convert ຮູບແບບ ────────────────────────────────────────
export function displayToIso(val) {
  if (!val || val.length < 8) return "";
  const d = parse(val, "dd/MM/yyyy", new Date());
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

export function isoToDisplay(iso) {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

function autoFormat(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}

// ─── ສ້າງ option list ───────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * TimeInput — ສ່ວນປ້ອນເວລາ ດ້ວຍ select dropdown (ຊົ່ວໂມງ + ນາທີ)
 * ໃຊ້ select ແທນ <input type="time"> ເພາະ native time picker ຖືກ block ໃນ iframe
 *
 * Props:
 *  value     — "HH:MM" string
 *  onChange  — (newValue: "HH:MM") => void
 *  disabled  — bool
 *  size      — "sm" | "md" (default "md")
 *  className — extra classes
 */
export function TimeInput({ value, onChange, disabled, size = "md", className }) {
  const [hh, mm] = (value ?? "00:00").split(":");
  const hour = (hh ?? "00").padStart(2, "0");
  const min  = (mm ?? "00").padStart(2, "0");

  const selectCls = [
    "flex-1 border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors appearance-none text-center",
    size === "sm" ? "py-1.5 px-1" : "py-2.5 px-2",
    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
  ].join(" ");

  return (
    <div className={`relative flex items-center gap-1 w-full border border-border rounded-xl bg-background overflow-hidden focus-within:border-[hsl(0,66%,42%)] transition-colors ${disabled ? "opacity-40" : ""} ${className ?? ""}`}>
      <Clock size={size === "sm" ? 13 : 14} className="text-muted-foreground flex-shrink-0 ml-2.5 pointer-events-none" />
      <select
        value={hour}
        disabled={disabled}
        onChange={e => onChange(`${e.target.value}:${min}`)}
        className={selectCls}
      >
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-muted-foreground font-bold text-sm select-none">:</span>
      <select
        value={min}
        disabled={disabled}
        onChange={e => onChange(`${hour}:${e.target.value}`)}
        className={`${selectCls} mr-1`}
      >
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

/**
 * DateInput — ສ່ວນປ້ອນວັນທີ ທີ່ support ທັງ typing ແລະ calendar picker
 * ໃຊ້ transparent <input type="date"> ທັບໄອຄອນ ແທນການ call showPicker()
 *
 * Props:
 *  value      — DD/MM/YYYY (isoMode=false) ຫຼື YYYY-MM-DD (isoMode=true)
 *  onChange   — (newValue: string) => void
 *  isoMode    — bool
 *  placeholder — string
 *  error      — bool | string
 *  min / max  — ISO string constraints for picker
 *  size       — "sm" | "md" (default "md")
 *  className  — extra classes
 */
export function DateInput({
  value,
  onChange,
  isoMode = false,
  placeholder,
  error,
  min,
  max,
  size = "md",
  className,
}) {
  const displayValue = isoMode ? isoToDisplay(value) : (value ?? "");
  const isoValue = isoMode ? (value ?? "") : displayToIso(value);

  const handleTextChange = (raw) => {
    const formatted = autoFormat(raw);
    onChange(isoMode ? displayToIso(formatted) : formatted);
  };

  const handlePickerChange = (iso) => {
    onChange(isoMode ? iso : isoToDisplay(iso));
  };

  const padding = size === "sm" ? "pl-3 pr-8 py-1.5" : "pl-3 pr-9 py-2.5";
  const iconSize = size === "sm" ? 14 : 16;
  const iconWidth = size === "sm" ? "w-8" : "w-9";

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type="text"
        inputMode="numeric"
        className={`w-full border rounded-lg ${padding} text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(0,66%,42%)] bg-background transition-colors ${
          error ? "border-red-400" : "border-border"
        }`}
        value={displayValue}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder ?? "DD/MM/YYYY"}
        maxLength={10}
      />
      {/* ── ໄອຄອນປະຕິທິນ: transparent date input ທັບ ─────────── */}
      <div className={`absolute right-0 top-0 bottom-0 ${iconWidth} flex items-center justify-center`}>
        <CalendarDays
          size={iconSize}
          className="text-muted-foreground pointer-events-none relative z-10"
        />
        <input
          type="date"
          value={isoValue}
          onChange={(e) => handlePickerChange(e.target.value)}
          min={min}
          max={max}
          tabIndex={-1}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          style={{ colorScheme: "light" }}
        />
      </div>
    </div>
  );
}
