// ════════════════════════════════════════════════════════════════
// customerTypes.js
// ກຳນົດປະເພດລູກຄ້າທັງໝົດ (code, label, style)
// ════════════════════════════════════════════════════════════════

export const CUSTOMER_TYPES = [
  { code: "IN", label: "ຜູ້ໃຊ້ທົ່ວໄປ",           emoji: "👤",  color: "hsl(220,70%,55%)",  gradient: "linear-gradient(90deg,#3b82f6,#60a5fa)",   track: "bg-blue-100",    textColor: "#2563eb",  iconColor: "text-blue-500 bg-blue-50"       },
  { code: "CC", label: "ບໍລິສັດ/ຮ້ານຄ້າ",        emoji: "🏢",  color: "hsl(160,60%,45%)",  gradient: "linear-gradient(90deg,#10b981,#34d399)",   track: "bg-emerald-100", textColor: "#059669",  iconColor: "text-emerald-600 bg-emerald-50" },
  { code: "CE", label: "ໂຮງຮຽນ/ມະຫາວິທະຍາໄລ",   emoji: "🎓",  color: "hsl(40,85%,52%)",   gradient: "linear-gradient(90deg,#f59e0b,#fbbf24)",   track: "bg-amber-100",   textColor: "#d97706",  iconColor: "text-amber-600 bg-amber-50"     },
  { code: "CG", label: "ກະຊວງ/ໂຮງໝໍ",           emoji: "🏛️", color: "hsl(0,60%,55%)",    gradient: "linear-gradient(90deg,#ef4444,#f87171)",   track: "bg-red-100",     textColor: "#dc2626",  iconColor: "text-red-500 bg-red-50"         },
  { code: "CB", label: "ທະນາຄານ/ສິນເຊື່ອ",       emoji: "🏦",  color: "hsl(280,55%,55%)",  gradient: "linear-gradient(90deg,#a855f7,#c084fc)",   track: "bg-purple-100",  textColor: "#9333ea",  iconColor: "text-purple-600 bg-purple-50"   },
  { code: "CI", label: "ສະຖານທູດ/NGO",           emoji: "🌐",  color: "hsl(195,70%,50%)",  gradient: "linear-gradient(90deg,#06b6d4,#67e8f9)",   track: "bg-cyan-100",    textColor: "#0891b2",  iconColor: "text-cyan-600 bg-cyan-50"       },
  { code: "CP", label: "ໄຟຟ້າ/ອຸດສາຫະກຳ",        emoji: "⚡",  color: "hsl(55,85%,45%)",   gradient: "linear-gradient(90deg,#ca8a04,#eab308)",   track: "bg-yellow-100",  textColor: "#ca8a04",  iconColor: "text-yellow-600 bg-yellow-50"   },
  { code: "SP", label: "ພະນັກງານ ລລທ",            emoji: "👔",  color: "hsl(320,55%,50%)",  gradient: "linear-gradient(90deg,#ec4899,#f9a8d4)",   track: "bg-pink-100",    textColor: "#db2777",  iconColor: "text-pink-600 bg-pink-50"       },
  { code: "IH", label: "In-house ພາຍໃນ",          emoji: "🏠",  color: "hsl(145,55%,42%)",  gradient: "linear-gradient(90deg,#16a34a,#4ade80)",   track: "bg-green-100",   textColor: "#15803d",  iconColor: "text-green-700 bg-green-50"     },
  { code: "IO", label: "In-house ພາຍນອກ",         emoji: "📡",  color: "hsl(25,80%,50%)",   gradient: "linear-gradient(90deg,#ea580c,#fdba74)",   track: "bg-orange-100",  textColor: "#ea580c",  iconColor: "text-orange-600 bg-orange-50"   },
  { code: "CL", label: "ສາຍລະຫວ່າງປະເທດ",        emoji: "🔗",  color: "hsl(260,60%,55%)",  gradient: "linear-gradient(90deg,#7c3aed,#a78bfa)",   track: "bg-violet-100",  textColor: "#7c3aed",  iconColor: "text-violet-700 bg-violet-50"   },
];

// ─── Map code → type object ສຳລັບ lookup O(1) ───────────────────
export const TYPE_MAP = Object.fromEntries(CUSTOMER_TYPES.map(t => [t.code, t]));

// ─── ໄດ້ label ຂອງປະເພດ ──────────────────────────────────────────
export function getTypeLabel(code) {
  return TYPE_MAP[code]?.label ?? code ?? "—";
}

// ─── ໄດ້ emoji ຂອງປະເພດ ──────────────────────────────────────────
export function getTypeEmoji(code) {
  return TYPE_MAP[code]?.emoji ?? "👤";
}
