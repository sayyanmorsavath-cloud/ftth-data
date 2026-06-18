// ════════════════════════════════════════════════════════════════
// AuditLog.jsx
// ບັນທຶກ action ທັງໝົດໃນລະບົບ — ສຳລັບ Admin ເທົ່ານັ້ນ
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useListAuditLogs } from "@/lib/store/audit";
import {
  Shield, RefreshCw, ChevronLeft, ChevronRight,
  User, Clock, Edit2, Trash2, Plus, RotateCcw,
  LogIn, Wrench, Search, X,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ─── Icon ຕາມ action ──────────────────────────────────────────
const ACTION_CFG = {
  create:  { label: "ສ້າງ",     cls: "bg-emerald-100 text-emerald-700", icon: Plus },
  update:  { label: "ແກ້ໄຂ",   cls: "bg-blue-100 text-blue-700",       icon: Edit2 },
  delete:  { label: "ລຶບ",     cls: "bg-red-100 text-red-700",          icon: Trash2 },
  renew:   { label: "ຕໍ່ສັນຍາ", cls: "bg-purple-100 text-purple-700",  icon: RotateCcw },
  login:   { label: "Login",    cls: "bg-amber-100 text-amber-700",      icon: LogIn },
  dispatch:{ label: "ສ່ົງຊ່າງ", cls: "bg-slate-100 text-slate-700",     icon: Wrench },
};

const ENTITY_LABELS = {
  customer:           "ລູກຄ້າ",
  ticket:             "Ticket",
  payment:            "ການຊຳລະ",
  technician_visit:   "ໃບນັດຊ່າງ",
  staff:              "ພະນັກງານ",
};

function LogRow({ log }) {
  const cfg = ACTION_CFG[log.action] ?? { label: log.action, cls: "bg-muted text-muted-foreground", icon: Clock };
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.cls}`}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
          <span className="text-xs font-semibold text-muted-foreground">
            {ENTITY_LABELS[log.entityType] ?? log.entityType}
          </span>
          {log.entityName && (
            <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{log.entityName}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {log.performedBy && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User size={9} /> {log.performedBy}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock size={9} />
            {log.createdAt ? format(parseISO(log.createdAt), "dd/MM/yy HH:mm") : "—"}
          </span>
        </div>
        {log.details && Object.keys(log.details).length > 0 && (
          <div className="mt-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground max-w-full overflow-hidden">
            {Object.entries(log.details).slice(0, 4).map(([k, v]) => (
              <div key={k} className="truncate">
                <span className="font-semibold">{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLog() {
  const [page, setPage]           = useState(1);
  const [filterAction, setAction] = useState("");
  const [filterEntity, setEntity] = useState("");
  const [filterWho,    setWho]    = useState("");

  const { data, isLoading, refetch } = useListAuditLogs({
    page,
    pageSize:   30,
    action:     filterAction || undefined,
    entityType: filterEntity || undefined,
    performedBy: filterWho.trim() || undefined,
  });

  const logs       = data?.data       ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total      ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[hsl(0,66%,42%)] flex items-center justify-center shadow-lg">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">ບັນທຶກ Action</h1>
            <p className="text-xs text-muted-foreground">ປະຫວັດ action ທັງໝົດໃນລະບົບ · {total.toLocaleString()} ລາຍ</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterAction}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="text-xs border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]"
        >
          <option value="">ທຸກ Action</option>
          {Object.entries(ACTION_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select
          value={filterEntity}
          onChange={e => { setEntity(e.target.value); setPage(1); }}
          className="text-xs border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:border-[hsl(0,66%,42%)]"
        >
          <option value="">ທຸກ Entity</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div className="relative">
          <input
            value={filterWho}
            onChange={e => { setWho(e.target.value); setPage(1); }}
            placeholder="ຜູ້ດຳເນີນ..."
            className="pl-7 pr-7 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:border-[hsl(0,66%,42%)] w-32"
          />
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          {filterWho && (
            <button onClick={() => setWho("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Log list ─── */}
      <div className="bg-card border border-border rounded-2xl px-4 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
            <RefreshCw size={16} className="animate-spin" /> ກຳລັງໂຫລດ...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">ຍັງບໍ່ມີ action log</div>
        ) : (
          logs.map(log => <LogRow key={log.id} log={log} />)
        )}
      </div>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
