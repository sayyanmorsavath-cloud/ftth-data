// ════════════════════════════════════════════════════════════════
// permissions.js
// ກຳນົດ permissions ທີ່ມີໃນລະບົບ ແລະ ຟັງຊັນກວດສິດ
// ════════════════════════════════════════════════════════════════

import {
  LayoutDashboard, Users, Edit2, UserPlus, Activity,
  AlertCircle, BarChart2, Download, Upload, BadgeDollarSign,
  Tag, BookOpen, MapPin, Shield, TrendingUp, CalendarClock,
} from "lucide-react";

// ─── ລາຍຊື່ permissions ທັງໝົດໃນລະບົບ ──────────────────────────
export const ALL_PERMISSIONS = [
  { key: "dashboard",      label: "ໜ້າຫຼັກ",           group: "ທົ່ວໄປ",   icon: LayoutDashboard, defaultOn: true  },
  { key: "customers",      label: "ລູກຄ້າທັງໝົດ",      group: "ທົ່ວໄປ",   icon: Users,           defaultOn: true  },
  { key: "customers_edit", label: "ແກ້ໄຂ / ລຶບລູກຄ້າ", group: "ທົ່ວໄປ",   icon: Edit2,           defaultOn: true  },
  { key: "add_customer",   label: "ເພີ່ມລູກຄ້າ",        group: "ທົ່ວໄປ",   icon: UserPlus,        defaultOn: true  },
  { key: "tracking",       label: "ຕິດຕາມ",              group: "ທົ່ວໄປ",   icon: Activity,        defaultOn: true  },
  { key: "report_problem", label: "ແຈ້ງບັນຫາ",          group: "ທົ່ວໄປ",   icon: AlertCircle,     defaultOn: true  },
  { key: "help",           label: "ຄູ່ມືການໃຊ້ງານ",    group: "ທົ່ວໄປ",   icon: BookOpen,        defaultOn: true  },
  { key: "reports",        label: "ລາຍງານ",              group: "ຂໍ້ມູນ",    icon: BarChart2,       defaultOn: true  },
  { key: "export",         label: "ນຳອອກລູກຄ້າ",        group: "ຂໍ້ມູນ",    icon: Download,        defaultOn: true  },
  { key: "import",         label: "ນຳເຂົ້າລູກຄ້າ",      group: "ຂໍ້ມູນ",    icon: Upload,          defaultOn: false },
  { key: "revenue",        label: "ລາຍຮັບ",              group: "ຄວບຄຸມ",    icon: BadgeDollarSign, defaultOn: false },
  { key: "pricing",        label: "ລາຄາແພັກເກດ",         group: "ຄວບຄຸມ",    icon: Tag,             defaultOn: false },
  { key: "staff_stats",    label: "ສະຖິຕິພະນັກງານ",     group: "ຄວບຄຸມ",    icon: TrendingUp,      defaultOn: false },
  { key: "map",            label: "ແຜນທີ່ລູກຄ້າ",       group: "ຄວບຄຸມ",    icon: MapPin,          defaultOn: true  },
  { key: "audit",              label: "ບັນທຶກ Action",          group: "ຄວບຄຸມ",    icon: Shield,          defaultOn: false },
  { key: "expiry_calculator",  label: "ຄຳນວນວັນໝົດອາຍຸ",       group: "ຄວບຄຸມ",    icon: CalendarClock,   defaultOn: true  },
];

// ─── ກຸ່ມ permission ສຳລັບ UI ───────────────────────────────────
export const PERMISSION_GROUPS = ["ທົ່ວໄປ", "ຂໍ້ມູນ", "ຄວບຄຸມ"];

// ─── ລາຍຊື່ permissions ທີ່ເປີດໃຫ້ staff ໃໝ່ by default ────────
export const DEFAULT_STAFF_PERMISSIONS = ALL_PERMISSIONS
  .filter(p => p.defaultOn)
  .map(p => p.key);

// ─── ໄດ້ permission array ທີ່ມີຜົນ (null = ໃຊ້ default) ─────────
export function getEffectivePermissions(permissionsArr) {
  if (permissionsArr === null || permissionsArr === undefined) {
    return DEFAULT_STAFF_PERMISSIONS;
  }
  return Array.isArray(permissionsArr) ? permissionsArr : DEFAULT_STAFF_PERMISSIONS;
}

// ─── ກວດວ່າ user ມີສິດໃຊ້ key ໜ້ານີ້ ──────────────────────────
export function canAccess(user, key) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return getEffectivePermissions(user.permissions).includes(key);
}
