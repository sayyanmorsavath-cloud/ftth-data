// ════════════════════════════════════════════════════════════════
// Layout.jsx
// Shell ຫຼັກຂອງ app: sidebar navigation, bottom nav (mobile)
// ─── ຈັດການ dirty-state guard ກ່ອນ navigate ອອກໜ້າ
// ════════════════════════════════════════════════════════════════

import { Link, useRoute, useLocation } from "wouter";
import {
  LayoutDashboard, Users, UserPlus, Upload, Download,
  Activity, AlertCircle, BarChart2, ChevronLeft, ChevronRight,
  LogOut, ShieldCheck, UserCircle, UsersRound, MoreHorizontal, X, BookOpen, Tag, BadgeDollarSign, FolderOpen, Plus,
  MapPin, Shield, TrendingUp, CalendarClock,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";

const FAB_ACTIONS = [
  {
    href: "/add-customer",
    label: "ເພີ່ມລູກຄ້າ",
    icon: UserPlus,
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    shadow: "0 4px 16px rgba(16,185,129,0.55)",
  },
  {
    href: "/report-problem?new=1",
    label: "ແຈ້ງຕິດຂັດ",
    icon: AlertCircle,
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    shadow: "0 4px 16px rgba(245,158,11,0.55)",
  },
];

function FABButton({ open, setOpen }) {
  return (
    <div className="flex items-center justify-center" style={{ width: 72, position: "relative" }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 24 }}
        whileTap={{ scale: 0.88 }}
        className="flex items-center justify-center rounded-full text-white"
        style={{
          width: 62, height: 62,
          marginBottom: 8,
          background: open
            ? "linear-gradient(135deg, #7f1d1d, #b91c1c)"
            : "linear-gradient(135deg, hsl(0,72%,36%), hsl(0,66%,50%))",
          boxShadow: open
            ? "0 6px 20px rgba(185,28,28,0.6), 0 0 0 4px rgba(185,28,28,0.15)"
            : "0 6px 20px rgba(139,0,0,0.5), 0 0 0 4px rgba(139,0,0,0.12)",
          border: "3px solid white",
          zIndex: 51,
          position: "relative",
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

function FABOverlay({ open, setOpen }) {
  const [, setLocation] = useLocation();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 lg:hidden"
            style={{ background: "rgba(0,0,0,0.42)", backdropFilter: "blur(3px)", zIndex: 55 }}
            onClick={() => setOpen(false)}
          />
          {FAB_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            const xPos = i === 0
              ? "calc(50% - 70px)"
              : "calc(50% + 22px)";
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 26, delay: i * 0.07 }}
                className="fixed lg:hidden flex flex-col items-center gap-1.5"
                style={{
                  bottom: "calc(80px + env(safe-area-inset-bottom))",
                  left: xPos,
                  zIndex: 56,
                }}
              >
                <button
                  onClick={() => { setOpen(false); guardedNavigate(action.href, setLocation); }}
                  className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
                  style={{
                    width: 54, height: 54,
                    background: action.gradient,
                    boxShadow: action.shadow,
                    border: "2.5px solid rgba(255,255,255,0.35)",
                  }}
                >
                  <Icon size={22} strokeWidth={2} className="text-white" />
                </button>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.07 + 0.08 }}
                  className="text-white text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {action.label}
                </motion.span>
              </motion.div>
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
}

function guardedNavigate(href, setLocation) {
  if (window.__ltcDirty) {
    if (!window.confirm("ມີການປ່ຽນແປງທີ່ຍັງບໍ່ໄດ້ບັນທຶກ.\nຕ້ອງການອອກຈາກໜ້ານີ້ຫຼືບໍ່?")) return;
    window.__ltcDirty = false;
    window.__ltcDirtySet?.clear();
  }
  setLocation(href);
}

function MoreDrawerItem({ item, onClose }) {
  const Icon = item.icon;
  const [, setLocation] = useLocation();
  return (
    <div
      onClick={() => { onClose(); guardedNavigate(item.href, setLocation); }}
      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/60 active:bg-muted transition-colors cursor-pointer"
    >
      <Icon size={22} strokeWidth={1.8} className="text-[hsl(0,66%,42%)]" />
      <span className="text-[11px] font-medium text-foreground text-center leading-tight">{item.label}</span>
    </div>
  );
}

const ALL_NAV = [
  { href: "/",               label: "ໜ້າຫຼັກ",          icon: LayoutDashboard, permKey: "dashboard" },
  { href: "/customers",      label: "ລູກຄ້າທັງໝົດ",     icon: Users,           permKey: "customers" },
  { href: "/add-customer",   label: "ເພີ່ມລູກຄ້າ",      icon: UserPlus,        permKey: "add_customer" },
  { href: "/tracking",       label: "ຕິດຕາມ",            icon: Activity,        permKey: "tracking" },
  { href: "/report-problem", label: "ແຈ້ງບັນຫາ",        icon: AlertCircle,     permKey: "report_problem" },
  { href: "/import",                   label: "ນຳເຂົ້າລູກຄ້າ",       icon: Upload,          permKey: "import" },
  { href: "/customer-import-batches", label: "ໂຟລເດີ Import ລູກຄ້າ", icon: FolderOpen,      permKey: "import" },
  { href: "/export",         label: "ນຳອອກລູກຄ້າ",      icon: Download,        permKey: "export" },
  { href: "/reports",        label: "ລາຍງານ",            icon: BarChart2,       permKey: "reports" },
  { href: "/revenue",        label: "ລາຍຮັບ",            icon: BadgeDollarSign, permKey: "revenue" },
  { href: "/staff",          label: "ພະນັກງານ",          icon: UsersRound,      permKey: "__admin_only__" },
  { href: "/pricing",        label: "ລາຄາແພັກເກດ",      icon: Tag,             permKey: "pricing" },
  { href: "/staff-stats",    label: "ສະຖິຕິພະນັກງານ",   icon: TrendingUp,      permKey: "staff_stats" },
  { href: "/map",            label: "ແຜນທີ່ລູກຄ້າ",     icon: MapPin,          permKey: "map" },
  { href: "/audit",              label: "ບັນທຶກ Action",         icon: Shield,         permKey: "audit" },
  { href: "/expiry-calculator",  label: "ຄຳນວນໝົດອາຍຸ",        icon: CalendarClock,  permKey: "expiry_calculator" },
  { href: "/help",               label: "ຄູ່ມືການໃຊ້ງານ",      icon: BookOpen,       permKey: "help" },
];

const BOTTOM_LEFT_HREFS  = ["/", "/report-problem"];
const BOTTOM_RIGHT_HREFS = ["/tracking"];

function NavItem({ href, label, icon: Icon, collapsed }) {
  const [exactMatch] = useRoute(href);
  const [prefixMatch] = useRoute(href + "/:rest*");
  const active = exactMatch || prefixMatch;
  const [, setLocation] = useLocation();

  return (
    <div
      onClick={() => guardedNavigate(href, setLocation)}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 py-2 rounded-xl cursor-pointer transition-all duration-200 font-medium text-sm group mx-2",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-white/15 text-white shadow-lg"
          : "text-white/65 hover:bg-white/10 hover:text-white/90"
      )}
      style={active ? {
        boxShadow: "0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)"
      } : {}}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}
      <span className={cn(
        "flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-200",
        active
          ? "bg-white/20 shadow-inner"
          : "bg-white/5 group-hover:bg-white/10"
      )}>
        <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
      </span>
      {!collapsed && <span className="truncate text-[13px]">{label}</span>}
    </div>
  );
}

function BottomTabItem({ href, label, icon: Icon, onClick }) {
  const [exactMatch] = useRoute(href);
  const [prefixMatch] = useRoute(href + "/:rest*");
  const active = exactMatch || prefixMatch;
  const [, setLocation] = useLocation();

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors text-muted-foreground"
      >
        <Icon size={22} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  }

  return (
    <div
      onClick={() => guardedNavigate(href, setLocation)}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 cursor-pointer relative",
        active ? "text-[hsl(0,66%,42%)]" : "text-muted-foreground"
      )}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[hsl(0,66%,42%)]" />
      )}
      <span className={cn(
        "flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200",
        active ? "bg-red-50" : ""
      )}>
        <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, canAccess } = useAuth();

  const navItems = ALL_NAV.filter(item => {
    if (item.permKey === "__admin_only__") return user?.role === "admin";
    return canAccess(item.permKey);
  });

  const allBottomHrefs = [...BOTTOM_LEFT_HREFS, ...BOTTOM_RIGHT_HREFS];
  const bottomLeftTabs  = BOTTOM_LEFT_HREFS.map(href => navItems.find(n => n.href === href)).filter(Boolean);
  const bottomRightTabs = BOTTOM_RIGHT_HREFS.map(href => navItems.find(n => n.href === href)).filter(Boolean);
  const moreItems = navItems.filter(n => !allBottomHrefs.includes(n.href) && n.href !== "/add-customer");
  const sidebarWidth = collapsed ? "w-[64px]" : "w-[220px]";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {moreOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMoreOpen(false)} />
      )}

      <FABOverlay open={fabOpen} setOpen={setFabOpen} />

      {moreOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background rounded-t-2xl shadow-2xl pb-safe">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <span className="font-semibold text-foreground text-sm">ເມນູທັງໝົດ</span>
            <button onClick={() => setMoreOpen(false)} className="text-muted-foreground p-1">
              <X size={20} />
            </button>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            {moreItems.map(item => (
              <MoreDrawerItem key={item.href} item={item} onClose={() => setMoreOpen(false)} />
            ))}
          </div>
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={() => { setMoreOpen(false); logout(); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-red-600 bg-red-50 font-medium text-sm justify-center"
            >
              <LogOut size={16} /> ອອກຈາກລະບົບ
            </button>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-[100dvh] z-30 flex flex-col transition-all duration-300",
          sidebarWidth,
          "hidden lg:flex"
        )}
        style={{
          background: "linear-gradient(175deg, hsl(0,72%,36%) 0%, hsl(0,66%,42%) 40%, hsl(0,60%,30%) 100%)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.25)"
        }}
      >
        {/* ─── Logo / Brand ─── */}
        <div className={cn(
          "flex items-center border-b border-white/10 flex-shrink-0 h-[64px]",
          collapsed ? "justify-center px-0" : "gap-3 px-4"
        )}
          style={{ background: "rgba(0,0,0,0.12)" }}
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-white/20">
            <img src="/logo.jpg" alt="L.FTTH" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-bold text-white text-sm leading-tight whitespace-nowrap tracking-wide">LTC FTTH Tracker</div>
              <div className="text-white/50 text-[10px] whitespace-nowrap mt-0.5">ລະບົບຕິດຕາມ ແລະ ບັນຫາ</div>
            </div>
          )}
        </div>

        {/* ─── Nav Items ─── */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* ─── User card + logout ─── */}
        <div
          className={cn("border-t border-white/10 flex-shrink-0", collapsed ? "flex flex-col items-center gap-2 py-3" : "px-3 py-3 space-y-2")}
          style={{ background: "rgba(0,0,0,0.12)" }}
        >
          {!collapsed ? (
            <>
              <div
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)"
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                >
                  {user?.role === "admin"
                    ? <ShieldCheck size={14} className="text-white" />
                    : <UserCircle size={14} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-bold truncate">{user?.displayName || user?.username}</div>
                  <div className="text-white/50 text-[10px] truncate">{user?.phone ? user.phone : user?.username}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs font-medium"
              >
                <LogOut size={13} /> ອອກຈາກລະບົບ
              </button>
            </>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                {user?.role === "admin"
                  ? <ShieldCheck size={14} className="text-white" />
                  : <UserCircle size={14} className="text-white" />}
              </div>
              <button onClick={logout} title="ອອກຈາກລະບົບ" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200">
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>

        {/* ─── Collapse toggle ─── */}
        <div className="border-t border-white/10 flex-shrink-0" style={{ background: "rgba(0,0,0,0.15)" }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className={cn(
              "flex items-center gap-2 w-full py-2.5 text-white/50 hover:text-white transition-all duration-200 text-xs font-medium hover:bg-white/5",
              collapsed ? "justify-center" : "px-4"
            )}
            title={collapsed ? "ຂະຫຍາຍ" : "ຫຍໍ້"}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>ຫຍໍ້ເມນູ</span></>}
          </button>
        </div>
      </aside>

      <div className={cn("hidden lg:block flex-shrink-0 transition-all duration-300", sidebarWidth)} />

      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(0,72%,36%) 0%, hsl(0,66%,42%) 100%)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            paddingTop: "env(safe-area-inset-top)",
            height: "calc(52px + env(safe-area-inset-top))"
          }}>
          <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/30">
            <img src="/logo.jpg" alt="L.FTTH" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white text-sm flex-1 tracking-wide">LTC FTTH Tracker</span>
          <div className="flex items-center gap-2">
            {user?.role === "admin"
              ? <ShieldCheck size={14} className="text-white/70" />
              : <UserCircle size={14} className="text-white/70" />}
            <span className="text-xs text-white/80 font-medium">{user?.displayName || user?.username}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden lg:pb-0 pb-[calc(64px+env(safe-area-inset-bottom))]">
          {children}
        </main>

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex items-end"
          style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "calc(64px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-stretch w-full h-16">
            {bottomLeftTabs.map(tab => (
              <BottomTabItem key={tab.href} {...tab} />
            ))}

            <FABButton open={fabOpen} setOpen={setFabOpen} />

            {bottomRightTabs.map(tab => (
              <BottomTabItem key={tab.href} {...tab} />
            ))}
            <BottomTabItem
              href="#"
              label="ເພີ່ມຕື່ມ"
              icon={MoreHorizontal}
              onClick={() => setMoreOpen(o => !o)}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}
