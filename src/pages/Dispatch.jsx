// ════════════════════════════════════════════════════════════════
// Dispatch.jsx
// ໜ້ານັດໝາຍຊ່າງ / ສ່ົງຊ່າງລົງພາກສະໜາມ
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  useListVisits, useCreateVisit, useUpdateVisit, useDeleteVisit,
} from "@/lib/store/dispatch";
import {
  Wrench, Plus, X, RefreshCw, CheckCircle2, Clock, XCircle,
  MapPin, Phone, User, Calendar, ChevronDown, ChevronUp,
  AlertTriangle, Trash2, Edit2, Save,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/auth/AuthContext";

// ─── ສະຖານະ visit ─────────────────────────────────────────────
const STATUS_CFG = {
  pending:     { label: "ລໍຖ້າ",       cls: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500",   icon: Clock },
  in_progress: { label: "ກຳລັງດຳເນີນ", cls: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500",    icon: RefreshCw },
  completed:   { label: "ສຳເລັດ",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  cancelled:   { label: "ຍົກເລີກ",     cls: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400",   icon: XCircle },
};

const PROBLEM_TYPES = [
  "ອິນເຕີເນັດຊ້າ", "ສາຍຂາດ", "ONU/ONT ບໍ່ເຮັດວຽກ", "ຕິດຕັ້ງໃໝ່",
  "ຍ້າຍທໍ່ / ສາຍ", "ກວດສອບທົ່ວໄປ", "ອື່ນໆ",
];

const TECHNICIAN_LIST = ["ຊ່າງ A", "ຊ່າງ B", "ຊ່າງ C", "ຊ່າງ D"];

// ─── ຟອມສ້າງ visit ─────────────────────────────────────────────
function CreateVisitModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerAddress: "",
    technician: TECHNICIAN_LIST[0],
    problemType: PROBLEM_TYPES[0],
    scheduledDate: format(new Date(), "yyyy-MM-dd"),
    scheduledTime: "09:00",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.technician) return;
    setSaving(true);
    await onCreate(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-bold text-foreground">ສ້າງໃບນັດໝາຍໃໝ່</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "ຊື່ລູກຄ້າ *", key: "customerName", placeholder: "ຊື່ລູກຄ້າ" },
            { label: "ເບີໂທ",        key: "customerPhone", placeholder: "020XXXXXXXX" },
            { label: "ທີ່ຢູ່",        key: "customerAddress", placeholder: "ທີ່ຢູ່ / ບ້ານ / ເມືອງ" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-muted-foreground mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">ຊ່າງ *</label>
              <select
                value={form.technician}
                onChange={e => set("technician", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
              >
                {TECHNICIAN_LIST.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">ປະເພດ</label>
              <select
                value={form.problemType}
                onChange={e => set("problemType", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
              >
                {PROBLEM_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">ວັນທີ</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={e => set("scheduledDate", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">ເວລາ</label>
              <input
                type="time"
                value={form.scheduledTime}
                onChange={e => set("scheduledTime", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">ໝາຍເຫດ</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={2}
              placeholder="ລາຍລະອຽດເພີ່ມຕື່ມ..."
              className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted">
              ຍົກເລີກ
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.customerName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-bold hover:bg-[hsl(0,66%,35%)] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VisitCard ─────────────────────────────────────────────────
function VisitCard({ visit, onStatusChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[visit.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground">{visit.customerName}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User size={9} /> {visit.technician}
            </span>
            {visit.scheduledDate && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar size={9} /> {visit.scheduledDate} {visit.scheduledTime || ""}
              </span>
            )}
            <span className="text-[10px] font-medium text-blue-600">{visit.problemType}</span>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.cls}`}>
          <Icon size={9} /> {cfg.label}
        </span>
        <button onClick={() => setOpen(o => !o)} className="text-muted-foreground">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {visit.customerPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={13} className="text-muted-foreground" />
              <span>{visit.customerPhone}</span>
            </div>
          )}
          {visit.customerAddress && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={13} className="text-muted-foreground" />
              <span>{visit.customerAddress}</span>
            </div>
          )}
          {visit.notes && (
            <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">{visit.notes}</p>
          )}
          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CFG)
              .filter(([k]) => k !== visit.status)
              .map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => onStatusChange(visit.id, k)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all hover:opacity-80 ${v.cls}`}
                >
                  → {v.label}
                </button>
              ))}
            <button
              onClick={() => { if (window.confirm("ລຶບໃບນັດນີ້?")) onDelete(visit.id); }}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 ml-auto"
            >
              <Trash2 size={10} className="inline mr-1" />ລຶບ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dispatch() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const { user } = useAuth();

  const { data: page, isLoading, refetch } = useListVisits({ status: filterStatus || undefined });
  const createVisit  = useCreateVisit();
  const updateVisit  = useUpdateVisit();
  const deleteVisit  = useDeleteVisit();

  const visits = page?.data ?? [];

  const handleCreate = async (form) => {
    await createVisit.mutateAsync({ ...form, createdBy: user?.username });
  };

  const handleStatusChange = async (id, status) => {
    await updateVisit.mutateAsync({ id, data: { status } });
  };

  const handleDelete = async (id) => {
    await deleteVisit.mutateAsync({ id });
  };

  const counts = {
    pending:     visits.filter(v => v.status === "pending").length,
    in_progress: visits.filter(v => v.status === "in_progress").length,
    completed:   visits.filter(v => v.status === "completed").length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-lg">
            <Wrench size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">ນັດໝາຍຊ່າງ</h1>
            <p className="text-xs text-muted-foreground">ຈັດການສ່ົງຊ່າງລົງພາກສະໜາມ</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-bold hover:bg-[hsl(0,66%,35%)] transition-colors shadow-sm"
        >
          <Plus size={15} /> ນັດໃໝ່
        </button>
      </div>

      {/* ─── Summary ─── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "pending",     label: "ລໍຖ້າ",        color: "text-amber-700", bg: "bg-amber-50" },
          { key: "in_progress", label: "ກຳລັງດຳເນີນ", color: "text-blue-700",  bg: "bg-blue-50" },
          { key: "completed",   label: "ສຳເລັດ",        color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.key} className={`${s.bg} rounded-xl px-3 py-2 text-center`}>
            <div className={`text-lg font-black ${s.color}`}>{counts[s.key] ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Filter tabs ─── */}
      <div className="flex gap-2 flex-wrap">
        {[["", "ທັງໝົດ"], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilterStatus(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filterStatus === k
                ? "bg-[hsl(0,66%,42%)] text-white border-[hsl(0,66%,42%)]"
                : "bg-background text-muted-foreground border-border hover:border-[hsl(0,66%,42%)] hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── List ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <RefreshCw size={16} className="animate-spin" /> ກຳລັງໂຫລດ...
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Wrench size={40} className="text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">ຍັງບໍ່ມີໃບນັດໝາຍ</p>
          <button onClick={() => setShowCreate(true)} className="text-xs text-[hsl(0,66%,42%)] font-semibold">
            + ສ້າງໃໝ່
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map(v => (
            <VisitCard key={v.id} visit={v} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateVisitModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
