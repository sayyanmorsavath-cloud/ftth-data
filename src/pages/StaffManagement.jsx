import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  Users, UserPlus, Pencil, Trash2, Phone, ShieldCheck,
  UserCircle, Eye, EyeOff, X, CheckCircle2, AlertTriangle,
  Lock, User, AtSign, KeyRound, BadgeCheck, ArrowLeftRight,
  Shield, Settings2, ChevronDown, ChevronUp, Save, RefreshCw,
  LayoutDashboard, Edit2, Activity, AlertCircle, BarChart2,
  Download, Upload, BadgeDollarSign, Tag, BookOpen, Copy, Check,
} from "lucide-react";
import {
  ALL_PERMISSIONS, PERMISSION_GROUPS, DEFAULT_STAFF_PERMISSIONS, getEffectivePermissions,
} from "@/lib/permissions";
import { getStaffPermissions } from "@/lib/store/db";

const EMPTY = { username: "", displayName: "", phone: "", password: "" };

const GROUP_COLOR = {
  "ທົ່ວໄປ":  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500",   accent: "#3b82f6" },
  "ຂໍ້ມູນ":   { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500", accent: "#8b5cf6" },
  "ຄວບຄຸມ":   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-500",  accent: "#f59e0b" },
};

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function getAvatarColor(username) {
  const colors = [
    ["hsl(220,70%,36%)", "hsl(220,60%,55%)"],
    ["hsl(160,60%,28%)", "hsl(160,55%,42%)"],
    ["hsl(270,50%,36%)", "hsl(270,45%,52%)"],
    ["hsl(30,70%,34%)", "hsl(30,65%,50%)"],
    ["hsl(190,65%,30%)", "hsl(190,60%,44%)"],
    ["hsl(340,60%,34%)", "hsl(340,55%,48%)"],
    ["hsl(50,65%,30%)", "hsl(50,60%,44%)"],
  ];
  const idx = username.charCodeAt(0) % colors.length;
  return `linear-gradient(135deg, ${colors[idx][0]} 0%, ${colors[idx][1]} 100%)`;
}

function PasswordStrength({ password }) {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const score = len === 0 ? 0 : len < 4 ? 1 : len < 6 ? 2 : (len >= 8 && (hasUpper || hasNum)) ? 4 : 3;
  const levels = [
    { label: "", color: "bg-border" },
    { label: "ອ່ອນ", color: "bg-red-400" },
    { label: "ພໍໃຊ້", color: "bg-amber-400" },
    { label: "ດີ", color: "bg-blue-400" },
    { label: "ແຂງແກ່ນ", color: "bg-emerald-500" },
  ];
  const level = levels[score];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? level.color : "bg-border"}`} />
        ))}
      </div>
      {level.label && <p className={`text-[10px] font-semibold ${score <= 1 ? "text-red-500" : score === 2 ? "text-amber-500" : score === 3 ? "text-blue-500" : "text-emerald-500"}`}>{level.label}</p>}
    </div>
  );
}

function RoleBadge({ role }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(0,66%,95%)] text-[hsl(0,66%,38%)] border border-[hsl(0,66%,80%)]">
      <ShieldCheck size={9} /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
      <UserCircle size={9} /> Staff
    </span>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-all duration-200 focus:outline-none
        ${checked ? "bg-emerald-500 border-emerald-500" : "bg-slate-200 border-slate-200"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function PermissionModal({ staff, onClose, onSave }) {
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const stored = await getStaffPermissions(staff.username);
      setPerms(getEffectivePermissions(stored));
      setLoading(false);
    })();
  }, [staff.username]);

  const toggle = (key) => {
    setPerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const setGroup = (group, on) => {
    const keys = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    if (on) {
      setPerms(prev => Array.from(new Set([...prev, ...keys])));
    } else {
      setPerms(prev => prev.filter(k => !keys.includes(k)));
    }
  };

  const resetToDefault = () => setPerms([...DEFAULT_STAFF_PERMISSIONS]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(staff.username, perms);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const enabledCount = perms.length;
  const totalCount = ALL_PERMISSIONS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,44%) 100%)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                <Settings2 size={17} className="text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-base">ຕັ້ງສິດທິ໌ການໃຊ້ງານ</h2>
                <p className="text-white/65 text-xs mt-0.5">ກຳນົດສິ່ງທີ່ {staff.displayName} ສາມາດເຂົ້າໃຊ້ໄດ້</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
          {/* Staff info strip */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5 border border-white/15">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
              style={{ background: getAvatarColor(staff.username) }}>
              {getInitials(staff.displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">{staff.displayName}</div>
              <div className="text-white/55 text-[10px]">@{staff.username}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-extrabold text-lg leading-none">{enabledCount}</div>
              <div className="text-white/50 text-[10px]">/ {totalCount} ສິດທິ໌</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex gap-2">
                <button onClick={() => setPerms(ALL_PERMISSIONS.map(p => p.key))}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  ເປີດທັງໝົດ
                </button>
                <button onClick={() => setPerms([])}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                  ປິດທັງໝົດ
                </button>
                <button onClick={resetToDefault}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1">
                  <RefreshCw size={11} /> ຄ່າເລີ່ມຕົ້ນ
                </button>
              </div>

              {/* Permission groups */}
              {PERMISSION_GROUPS.map(group => {
                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                const allOn = groupPerms.every(p => perms.includes(p.key));
                const someOn = groupPerms.some(p => perms.includes(p.key));
                const gColor = GROUP_COLOR[group];
                const isExpanded = expandedGroup === group;

                return (
                  <div key={group} className={`rounded-2xl border-2 overflow-hidden ${gColor.border}`}>
                    {/* Group header */}
                    <div
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${gColor.bg} transition-colors`}
                      onClick={() => setExpandedGroup(isExpanded ? null : group)}
                    >
                      <div className={`w-2 h-2 rounded-full ${gColor.dot} flex-shrink-0`} />
                      <span className={`font-extrabold text-sm flex-1 ${gColor.text}`}>{group}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gColor.bg} ${gColor.text} border ${gColor.border}`}>
                          {groupPerms.filter(p => perms.includes(p.key)).length}/{groupPerms.length}
                        </span>
                        <Toggle
                          checked={allOn}
                          onChange={(on) => { setGroup(group, on); }}
                          disabled={false}
                        />
                        {isExpanded ? <ChevronUp size={14} className={gColor.text} /> : <ChevronDown size={14} className={gColor.text} />}
                      </div>
                    </div>

                    {/* Permission rows */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-50 bg-white">
                        {groupPerms.map(perm => {
                          const Icon = perm.icon;
                          const on = perms.includes(perm.key);
                          return (
                            <div key={perm.key}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer select-none ${on ? "bg-white" : "bg-slate-50/50"}`}
                              onClick={() => toggle(perm.key)}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${on ? "" : "opacity-40"}`}
                                style={{ background: gColor.accent + "18" }}>
                                <Icon size={14} style={{ color: on ? gColor.accent : "#94a3b8" }} />
                              </div>
                              <span className={`flex-1 text-sm font-semibold transition-colors ${on ? "text-slate-800" : "text-slate-400"}`}>
                                {perm.label}
                              </span>
                              {perm.defaultOn === false && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full mr-1">Admin</span>
                              )}
                              <Toggle checked={on} onChange={() => toggle(perm.key)} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex gap-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
            ຍົກເລີກ
          </button>
          <button onClick={handleSave} disabled={saving || saved}
            className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow transition-all flex items-center justify-center gap-2
              ${saved ? "bg-emerald-500" : "bg-gradient-to-r from-[hsl(0,66%,36%)] to-[hsl(0,66%,48%)] hover:from-[hsl(0,66%,30%)] hover:to-[hsl(0,66%,42%)]"}
              disabled:opacity-70`}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງບັນທຶກ...</>
              : saved
              ? <><CheckCircle2 size={16} />ບັນທຶກແລ້ວ!</>
              : <><Save size={15} />ບັນທຶກສິດທິ໌</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffManagement() {
  const { staffList, addStaff, updateStaff, deleteStaff, updateStaffPermissions, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [formSaved, setFormSaved] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState(null);
  const [permTarget, setPermTarget] = useState(null);
  const [staffPermsCache, setStaffPermsCache] = useState({});
  const [revealedPwds, setRevealedPwds] = useState(new Set());
  const [copiedPwd, setCopiedPwd] = useState(null);

  useEffect(() => {
    staffList.forEach(async (s) => {
      if (!(s.username in staffPermsCache)) {
        const p = await getStaffPermissions(s.username);
        setStaffPermsCache(prev => ({ ...prev, [s.username]: p }));
      }
    });
  }, [staffList]);

  const handleRoleChange = async (staff) => {
    const newRole = staff.role === "admin" ? "staff" : "admin";
    try {
      await updateStaff(staff.username, { role: newRole });
      setSaved("role");
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      console.error("Role change error:", err);
    }
    setRoleConfirm(null);
  };

  const openAdd = () => {
    setEditTarget(null); setForm({ ...EMPTY }); setError(""); setShowPass(false); setFormSaved(false); setShowForm(true);
  };

  const openEdit = (s) => {
    setEditTarget(s.username);
    setForm({ username: s.username, displayName: s.displayName, phone: s.phone, password: s.password });
    setError(""); setShowPass(false); setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditTarget(null); setError(""); setFormSaved(false); };

  const handleSave = async () => {
    const u = form.username.trim().toLowerCase();
    const d = form.displayName.trim();
    const p = form.password.trim();
    if (!u) { setError("ກະລຸນາໃສ່ຊື່ຜູ້ໃຊ້"); return; }
    if (!/^[a-z0-9_]+$/.test(u)) { setError("ຊື່ຜູ້ໃຊ້ໃຊ້ໄດ້ສະເພາະ a-z, 0-9, _"); return; }
    if (!d) { setError("ກະລຸນາໃສ່ຊື່ສະແດງ"); return; }
    if (!p) { setError("ກະລຸນາໃສ່ລະຫັດຜ່ານ"); return; }
    if (p.length < 4) { setError("ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 4 ຕົວ"); return; }
    try {
      if (editTarget === null) {
        if (u === "admin" || staffList.some(s => s.username === u)) { setError("ຊື່ຜູ້ໃຊ້ນີ້ມີຢູ່ແລ້ວ"); return; }
        await addStaff({ username: u, password: p, role: "staff", displayName: d, phone: form.phone.trim() });
        setSaved("add");
        setTimeout(() => setSaved(null), 3000);
        setFormSaved(true);
        setError("");
      } else {
        await updateStaff(editTarget, { displayName: d, phone: form.phone.trim(), password: p });
        setSaved("edit");
        setTimeout(() => setSaved(null), 2500);
        closeForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່");
    }
  };

  const handleDelete = async (username) => {
    try {
      await deleteStaff(username);
    } catch (err) {
      console.error("Delete staff error:", err);
    }
    setDeleteConfirm(null);
  };

  const handleSavePermissions = async (username, perms) => {
    await updateStaffPermissions(username, perms);
    setStaffPermsCache(prev => ({ ...prev, [username]: perms }));
    setSaved("perm");
    setTimeout(() => setSaved(null), 3000);
  };

  const totalStaff = staffList.length + 1;
  const deleteTarget = staffList.find(s => s.username === deleteConfirm);
  const permTargetStaff = staffList.find(s => s.username === permTarget);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,97%)]">
      {/* Header */}
      <div className="px-6 pt-8 pb-6" style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,40%) 60%, hsl(0,52%,52%) 100%)" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-lg">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">ຈັດການພະນັກງານ</h1>
              <p className="text-white/65 text-sm mt-0.5">ສ້າງ · ແກ້ໄຂ · ຕັ້ງສິດທິ໌ການເຂົ້າໃຊ້</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-white/30 text-white text-sm font-bold hover:bg-white/15 transition-all backdrop-blur shadow-lg">
            <UserPlus size={16} /> ເພີ່ມພະນັກງານ
          </button>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-3 sm:grid-cols-3 gap-3 mt-6">
          {[
            { label: "ທີມງານທັງໝົດ", value: totalStaff, icon: Users, color: "bg-white/20" },
            { label: "ຜູ້ດູແລລະບົບ", value: 1, icon: ShieldCheck, color: "bg-white/15" },
            { label: "ພະນັກງານ", value: staffList.length, icon: UserCircle, color: "bg-white/15" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} backdrop-blur rounded-xl px-4 py-3 border border-white/20`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={13} className="text-white/70" />
                <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Success toast */}
        {saved && (
          <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-5 py-3 text-emerald-700 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-sm">
                {saved === "add" ? "ເພີ່ມພະນັກງານສຳເລັດ"
                  : saved === "role" ? "ປ່ຽນສິດທິ໌ສຳເລັດ"
                  : saved === "perm" ? "ບັນທຶກສິດທິ໌ການໃຊ້ງານສຳເລັດ"
                  : "ອັບເດດຂໍ້ມູນສຳເລັດ"}
              </p>
              <p className="text-xs text-emerald-600">ການປ່ຽນແປງຖືກບັນທຶກແລ້ວ</p>
            </div>
          </div>
        )}

        {/* Admin account card */}
        <div className="bg-white rounded-2xl border-2 border-[hsl(0,66%,88%)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[hsl(0,66%,92%)]" style={{ background: "linear-gradient(to right, hsl(0,66%,97%), white)" }}>
            <div className="w-1 h-4 rounded-full bg-[hsl(0,66%,42%)]" />
            <ShieldCheck size={13} className="text-[hsl(0,66%,42%)]" />
            <p className="text-[11px] font-bold text-[hsl(0,66%,42%)] uppercase tracking-widest">ບັນຊີຜູ້ດູແລລະບົບ</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-md flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(0,66%,32%) 0%, hsl(0,66%,48%) 100%)" }}>
                AD
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-foreground text-base">ຜູ້ດູແລລະບົບ</span>
                  <RoleBadge role="admin" />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border">ລະບົບ</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><AtSign size={11} /> admin</span>
                  <span className="flex items-center gap-1"><Lock size={11} /> ແກ້ໄຂລະຫັດຜ່ານໃນ Settings</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-[hsl(0,66%,95%)] text-[hsl(0,66%,38%)] border border-[hsl(0,66%,80%)]">
                  <BadgeCheck size={12} /> ສິດທິ໌ສູງສຸດ — ເຂົ້າໃຊ້ໄດ້ທັງໝົດ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff list */}
        <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border" style={{ background: "linear-gradient(to right, hsl(220,30%,97%), white)" }}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-blue-500" />
              <UserCircle size={13} className="text-blue-500" />
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">ລາຍຊື່ພະນັກງານ</p>
              <span className="ml-1 bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">{staffList.length}</span>
            </div>
            <button onClick={openAdd} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              <UserPlus size={13} /> ເພີ່ມ
            </button>
          </div>

          {staffList.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">ຍັງບໍ່ມີພະນັກງານ</p>
              <p className="text-sm text-muted-foreground mb-4">ກົດ "ເພີ່ມພະນັກງານ" ເພື່ອເລີ່ມ</p>
              <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow"
                style={{ background: "linear-gradient(135deg, hsl(220,65%,36%), hsl(220,60%,52%))" }}>
                <UserPlus size={15} /> ເພີ່ມພະນັກງານໃໝ່
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staffList.map((s, idx) => {
                const isMe = s.username === user?.username;
                const cachedPerms = staffPermsCache[s.username];
                const effectivePerms = getEffectivePermissions(cachedPerms);
                const permCount = effectivePerms.length;
                const totalPerms = ALL_PERMISSIONS.length;

                return (
                  <div key={s.username} className={`px-4 sm:px-5 py-4 transition-colors ${isMe ? "bg-blue-50/60" : "hover:bg-[hsl(0,0%,98%)]"}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0 mt-1">{idx + 1}</span>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md flex-shrink-0"
                        style={{ background: getAvatarColor(s.username) }}>
                        {getInitials(s.displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{s.displayName}</span>
                          <RoleBadge role={s.role} />
                          {isMe && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">ຕົວທ່ານ</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><AtSign size={10} /> {s.username}</span>
                          {s.phone && <span className="flex items-center gap-1"><Phone size={10} /> {s.phone}</span>}
                          <span className="flex items-center gap-1">
                            <KeyRound size={10} />
                            <span className="font-mono tracking-wider">
                              {revealedPwds.has(s.username) ? (s.password ?? "—") : "•".repeat(Math.min(s.password?.length ?? 0, 8))}
                            </span>
                            <button
                              type="button"
                              title={revealedPwds.has(s.username) ? "ເຊື່ອງລະຫັດ" : "ສະແດງລະຫັດ"}
                              onClick={() => setRevealedPwds(prev => {
                                const next = new Set(prev);
                                next.has(s.username) ? next.delete(s.username) : next.add(s.username);
                                return next;
                              })}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {revealedPwds.has(s.username) ? <EyeOff size={10} /> : <Eye size={10} />}
                            </button>
                            {revealedPwds.has(s.username) && s.password && (
                              <button
                                type="button"
                                title="ຄັດລອກລະຫັດຜ່ານ"
                                onClick={() => {
                                  navigator.clipboard.writeText(s.password);
                                  setCopiedPwd(s.username);
                                  setTimeout(() => setCopiedPwd(null), 2000);
                                }}
                                className="text-muted-foreground hover:text-green-600 transition-colors"
                              >
                                {copiedPwd === s.username ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                              </button>
                            )}
                          </span>
                        </div>
                        {/* Permission summary */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border
                            ${permCount >= totalPerms * 0.8 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : permCount >= totalPerms * 0.5 ? "text-blue-700 bg-blue-50 border-blue-200"
                              : "text-slate-600 bg-slate-100 border-slate-200"}`}>
                            <Shield size={8} /> {permCount}/{totalPerms} ສິດທິ໌
                          </span>
                          {effectivePerms.slice(0, 4).map(k => {
                            const p = ALL_PERMISSIONS.find(x => x.key === k);
                            if (!p) return null;
                            return (
                              <span key={k} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                {p.label}
                              </span>
                            );
                          })}
                          {effectivePerms.length > 4 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
                              +{effectivePerms.length - 4} ເພີ່ມຕື່ມ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-3 ml-8 flex-wrap">
                      <button
                        type="button"
                        title="ຄັດລອກ username + ລະຫັດຜ່ານ"
                        onClick={() => {
                          const text = `ຊື່ຜູ້ໃຊ້: ${s.username}\nລະຫັດຜ່ານ: ${s.password ?? ""}`;
                          navigator.clipboard.writeText(text);
                          setCopiedPwd("__creds__" + s.username);
                          setTimeout(() => setCopiedPwd(null), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all">
                        {copiedPwd === "__creds__" + s.username
                          ? <><Check size={12} className="text-green-600" /> ຄັດລອກແລ້ວ!</>
                          : <><Copy size={12} /> ຄັດລອກ</>}
                      </button>
                      <button onClick={() => setPermTarget(s.username)} disabled={isMe}
                        title="ຕັ້ງສິດທິ໌ການໃຊ້ງານ"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[hsl(0,66%,42%)] bg-[hsl(0,66%,97%)] hover:bg-[hsl(0,66%,93%)] border border-[hsl(0,66%,85%)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <Settings2 size={12} /> ສິດທິ໌
                      </button>
                      <button onClick={() => setRoleConfirm(s)} disabled={isMe}
                        title={isMe ? "ບໍ່ສາມາດປ່ຽນສິດທິ໌ຕົວເອງ" : s.role === "admin" ? "ປ່ຽນເປັນ Staff" : "ຍົກລະດັບເປັນ Admin"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${s.role === "admin" ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200" : "text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200"}`}>
                        <ArrowLeftRight size={12} /> {s.role === "admin" ? "→ Staff" : "→ Admin"}
                      </button>
                      <button onClick={() => openEdit(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all">
                        <Pencil size={12} /> ແກ້ໄຂ
                      </button>
                      <button onClick={() => setDeleteConfirm(s.username)} disabled={isMe}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 size={12} /> ລຶບ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-slate-50">
            <div className="w-1 h-4 rounded-full bg-slate-400" />
            <Shield size={13} className="text-slate-500" />
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">ລາຍການສິດທິ໌ທັງໝົດ</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.map(group => {
                const gColor = GROUP_COLOR[group];
                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                return (
                  <div key={group} className={`rounded-xl p-4 border-2 ${gColor.border} ${gColor.bg}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${gColor.dot}`} />
                      <span className={`font-extrabold text-sm ${gColor.text}`}>{group}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {groupPerms.map(p => {
                        const Icon = p.icon;
                        return (
                          <li key={p.key} className="flex items-center gap-2 text-xs text-foreground">
                            <Icon size={11} style={{ color: gColor.accent }} className="flex-shrink-0" />
                            {p.label}
                            {!p.defaultOn && (
                              <span className="ml-auto text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Admin</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Permission Modal */}
      {permTarget && permTargetStaff && (
        <PermissionModal
          staff={permTargetStaff}
          onClose={() => setPermTarget(null)}
          onSave={handleSavePermissions}
        />
      )}

      {/* Role change confirm */}
      {roleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-border">
            <div className={`px-6 py-5 border-b ${roleConfirm.role === "staff" ? "bg-violet-50 border-violet-100" : "bg-amber-50 border-amber-100"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleConfirm.role === "staff" ? "bg-violet-100" : "bg-amber-100"}`}>
                  {roleConfirm.role === "staff" ? <ShieldCheck size={20} className="text-violet-600" /> : <UserCircle size={20} className="text-amber-600" />}
                </div>
                <div>
                  <h2 className={`font-extrabold text-base ${roleConfirm.role === "staff" ? "text-violet-700" : "text-amber-700"}`}>
                    {roleConfirm.role === "staff" ? "ຍົກລະດັບເປັນ Admin?" : "ປ່ຽນກັບເປັນ Staff?"}
                  </h2>
                  <p className={`text-xs mt-0.5 ${roleConfirm.role === "staff" ? "text-violet-500" : "text-amber-500"}`}>
                    {roleConfirm.role === "staff" ? "ຈະໄດ້ສິດທິ໌ດູແລລະບົບທັງໝົດ" : "ຈະສູນເສຍສິດທິ໌ admin"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5 bg-muted/50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                  style={{ background: getAvatarColor(roleConfirm.username) }}>
                  {getInitials(roleConfirm.displayName)}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{roleConfirm.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{roleConfirm.username}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <RoleBadge role={roleConfirm.role} />
                  <ArrowLeftRight size={13} className="text-muted-foreground" />
                  <RoleBadge role={roleConfirm.role === "staff" ? "admin" : "staff"} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRoleConfirm(null)} className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                  ຍົກເລີກ
                </button>
                <button onClick={() => handleRoleChange(roleConfirm)}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow ${roleConfirm.role === "staff" ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-500 hover:bg-amber-600"}`}>
                  ຢືນຢັນ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-5 text-white" style={{ background: "linear-gradient(135deg, hsl(0,66%,30%) 0%, hsl(0,66%,44%) 100%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    {editTarget ? <Pencil size={17} className="text-white" /> : <UserPlus size={17} className="text-white" />}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base">{editTarget ? "ແກ້ໄຂຂໍ້ມູນພະນັກງານ" : "ເພີ່ມພະນັກງານໃໝ່"}</h2>
                    {editTarget && <p className="text-white/65 text-xs mt-0.5">@{editTarget}</p>}
                  </div>
                </div>
                <button onClick={closeForm} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {formSaved && (
                <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3">
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-700">ສ້າງບັນຊີສຳເລັດ</p>
                    <p className="text-xs text-emerald-600 font-mono">@{form.username}</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
              )}

              {/* Username */}
              {!editTarget && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ຊື່ຜູ້ໃຊ້ (Username)</label>
                  <div className="relative">
                    <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="ຕົວຢ່າງ: somchai01"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors font-mono" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">ໃຊ້ໄດ້ສະເພາະ a-z, 0-9, _ (ຕົວພິມນ້ອຍ)</p>
                </div>
              )}

              {/* Display name */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ຊື່ສະແດງ</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="ຊື່ທີ່ຈະສະແດງໃນລະບົບ"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ເບີໂທ (ບໍ່ບັງຄັບ)</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="020xxxxxxxx"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">ລະຫັດຜ່ານ</label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPass ? "text" : "password"} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="ຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border-2 border-border text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] transition-colors" />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                  {formSaved ? "ປິດ" : "ຍົກເລີກ"}
                </button>
                {!formSaved && (
                  <button onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow transition-all"
                    style={{ background: "linear-gradient(135deg, hsl(0,66%,34%), hsl(0,66%,48%))" }}>
                    {editTarget ? "ອັບເດດ" : "ສ້າງບັນຊີ"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-border">
            <div className="px-6 py-5 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-red-700">ລຶບພະນັກງານ?</h2>
                  <p className="text-xs mt-0.5 text-red-500">ການລຶບບໍ່ສາມາດກູ້ຄືນໄດ້</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5 bg-muted/50 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                  style={{ background: getAvatarColor(deleteTarget.username) }}>
                  {getInitials(deleteTarget.displayName)}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{deleteTarget.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{deleteTarget.username}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border-2 border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                  ຍົກເລີກ
                </button>
                <button onClick={() => handleDelete(deleteTarget.username)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow">
                  ລຶບ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
