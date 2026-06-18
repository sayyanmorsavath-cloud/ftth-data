// ════════════════════════════════════════════════════════════════
// CustomerImportBatches.jsx
// ໜ້າຈັດການໂຟລເດີ import ລູກຄ້າ
// ─── ແຕ່ລະ batch = 1 ໄຟລ໌ Excel ທີ່ import ເຂົ້າລະບົບ
// ─── ຂໍ້ມູນ batch ເກັບໃນ localStorage (metadata ເທົ່ານັ້ນ)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCustomerBatches, saveCustomerBatch, updateCustomerBatchName, removeCustomerBatch } from "@/lib/customerImportBatches";
import { format, parseISO } from "date-fns";
import {
  Folder, FolderOpen, Pencil, Trash2, X, Check, RefreshCw,
  FileSpreadsheet, Search, Calendar, Hash, Users, UserCheck,
} from "lucide-react";

const STATUS_CFG = {
  active:   { label: "ໃຊ້ງານ",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  expired:  { label: "ໝົດອາຍຸ",    cls: "bg-red-100 text-red-700 border-red-200" },
  inactive: { label: "ບໍ່ໃຊ້",      cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function ConfirmDeleteModal({ batch, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-red-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">ລຶບໂຟລເດີ?</h3>
            <p className="text-slate-500 text-xs mt-0.5">ການດຳເນີນການນີ້ບໍ່ສາມາດຍ້ອນຄືນໄດ້</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-2xl px-4 py-3 mb-5 border border-red-100">
          <p className="font-semibold text-sm text-slate-800">{batch.name}</p>
          <p className="text-xs text-red-600 mt-1">
            ຈະລຶບ <span className="font-bold">{batch.count}</span> ລາຍການລູກຄ້າ ອອກຈາກລະບົບທັງໝົດ
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            ຍົກເລີກ
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງລຶບ...</>
              : <><Trash2 size={14} />ລຶບ</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailModal({ batch, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!batch.customerIds?.length) { setLoading(false); return; }
    supabase
      .from("customers")
      .select("id, name, phone, account_id, speed, expiry_date, status, address")
      .in("id", batch.customerIds)
      .order("name", { ascending: true })
      .then(({ data }) => {
        setCustomers(data ?? []);
        setLoading(false);
      });
  }, [batch]);

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return [c.name, c.phone, c.account_id, c.address].some(v => (v ?? "").toLowerCase().includes(s));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,hsl(0,66%,28%),hsl(0,66%,44%))" }}>
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
            <FolderOpen size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-white text-sm truncate">{batch.name}</h2>
            <p className="text-white/60 text-[11px] mt-0.5">
              {batch.importedAt ? format(parseISO(batch.importedAt), "dd/MM/yyyy HH:mm") : "—"} · {batch.count} ລາຍການ
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ຄົ້ນຫາ ຊື່, ເບີ, ID..."
              className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
              ກຳລັງໂຫລດ...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Users size={28} className="mb-2 opacity-30" />
              <p className="text-sm">{customers.length === 0 ? "ບໍ່ມີຂໍ້ມູນລູກຄ້າ" : "ບໍ່ພົບລາຍການ"}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">ຊື່ລູກຄ້າ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">ເບີ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Account ID</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">ຄວາມໄວ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">ໝົດ</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">ສະຖານະ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const st = STATUS_CFG[c.status] ?? STATUS_CFG.inactive;
                  const expiry = c.expiry_date ? c.expiry_date.slice(0, 10).split("-").reverse().join("/") : "—";
                  return (
                    <tr key={c.id} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{c.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono">{c.phone ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[hsl(0,66%,42%)] font-bold">{c.account_id ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500">{c.speed ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{expiry}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <span className="text-xs text-slate-400">ທັງໝົດ {filtered.length} / {customers.length} ລາຍການ</span>
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors">
            ປິດ
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderCard({ batch, onRename, onDelete, onView }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(batch.name);
  const dateStr = batch.importedAt ? format(parseISO(batch.importedAt), "dd/MM/yyyy HH:mm") : "—";

  const handleSave = () => {
    if (name.trim()) onRename(batch.id, name.trim());
    setEditing(false);
  };

  return (
    <div className="group bg-white rounded-2xl border-2 border-slate-100 hover:border-[hsl(0,66%,42%)]/30 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,hsl(0,66%,36%),hsl(0,66%,56%))" }} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[hsl(0,66%,42%)]/10">
            <Folder size={22} className="text-[hsl(0,66%,42%)]" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input autoFocus value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setName(batch.name); setEditing(false); } }}
                  className="flex-1 text-sm font-bold border-2 border-[hsl(0,66%,42%)] rounded-lg px-2 py-1 focus:outline-none min-w-0" />
                <button onClick={handleSave} className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-600 flex-shrink-0">
                  <Check size={13} />
                </button>
                <button onClick={() => { setName(batch.name); setEditing(false); }} className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300 flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <p className="font-bold text-sm text-slate-800 leading-tight break-words line-clamp-2">{batch.name}</p>
            )}
            {batch.fileName && (
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px] mt-1" title={batch.fileName}>
                {batch.fileName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Hash size={12} className="text-[hsl(0,66%,42%)] flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium">ຈຳນວນ</p>
              <p className="font-extrabold text-slate-800 text-sm leading-tight">{batch.count} <span className="text-[10px] font-normal text-slate-500">ລາຍການ</span></p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar size={12} className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium">ນຳເຂົ້າ</p>
              <p className="font-semibold text-slate-700 text-[11px] leading-tight">{dateStr}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => onView(batch)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[hsl(0,66%,42%)] hover:bg-[hsl(0,66%,36%)] text-white text-xs font-bold transition-colors">
          <FolderOpen size={13} /> ເປີດ
        </button>
        <button onClick={() => setEditing(true)} title="ປ່ຽນຊື່"
          className="w-9 h-9 rounded-xl border-2 border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(batch)} title="ລຶບ"
          className="w-9 h-9 rounded-xl border-2 border-red-100 hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-all">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function CustomerImportBatches() {
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [tableError, setTableError] = useState(false);

  const load = useCallback(async () => {
    try {
      setTableError(false);
      setBatches(await getCustomerBatches());
    } catch (e) {
      if (e?.message?.includes("relation") || e?.code === "42P01") setTableError(true);
      setBatches([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ─── Recover: ສ້າງໂຟລເດີຈາກລູກຄ້າທີ່ import ໄວ້ແລ້ວໃນ DB ───
  const handleRecover = async () => {
    setRecovering(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data?.length) { alert("ບໍ່ພົບລູກຄ້າໃນລະບົບ"); return; }
      await saveCustomerBatch({
        id:          crypto.randomUUID(),
        name:        "ລູກຄ້າທີ່ import ໄວ້ກ່ອນໜ້ານີ້",
        fileName:    "",
        importedAt:  new Date().toISOString(),
        count:       data.length,
        customerIds: data.map(r => r.id),
      });
      await load();
    } catch (e) {
      alert("ຜິດພາດ: " + e.message);
    } finally {
      setRecovering(false);
    }
  };

  const handleRename = async (id, name) => {
    await updateCustomerBatchName(id, name);
    load();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.customerIds?.length) {
        await supabase.from("customers").delete().in("id", deleteTarget.customerIds);
      }
      await removeCustomerBatch(deleteTarget.id);
      load();
      setDeleteTarget(null);
    } catch (e) {
      alert("ລຶບຜິດພາດ: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = batches.filter(b =>
    !search.trim() ||
    b.name.toLowerCase().includes(search.trim().toLowerCase()) ||
    (b.fileName ?? "").toLowerCase().includes(search.trim().toLowerCase())
  );

  const totalCustomers = batches.reduce((s, b) => s + (b.count ?? 0), 0);

  return (
    <div className="min-h-full bg-muted/30 pb-10">
      <div className="bg-background border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,hsl(0,66%,28%),hsl(0,66%,44%))" }}>
            <Folder size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-foreground text-base leading-tight">ໂຟລເດີ Import ລູກຄ້າ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {batches.length > 0
                ? `${batches.length} ໂຟລເດີ · ${totalCustomers.toLocaleString()} ລາຍການລູກຄ້າ`
                : "ຍັງບໍ່ມີໂຟລເດີ"}
            </p>
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="ໂຫລດໃໝ່">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-5">
        {/* ─── banner: table ຍັງບໍ່ໄດ້ສ້າງ ─── */}
        {tableError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm">
            <p className="font-bold text-red-700 mb-1">⚠ ຕ້ອງສ້າງ table ກ່ອນ</p>
            <p className="text-red-600 mb-3">
              ກະລຸນາໄປທີ່ <strong>Supabase Dashboard → SQL Editor</strong> ແລ້ວ run SQL ນີ້:
            </p>
            <pre className="bg-red-100 rounded-xl p-3 text-xs text-red-800 overflow-x-auto whitespace-pre-wrap select-all">{`CREATE TABLE IF NOT EXISTS import_batches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL DEFAULT 'customer',
  name        TEXT        NOT NULL,
  file_name   TEXT        NOT NULL DEFAULT '',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count       INTEGER     NOT NULL DEFAULT 0,
  item_ids    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`}</pre>
            <button onClick={load} className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
              ລອງໃໝ່
            </button>
          </div>
        )}
        {!tableError && batches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
              <Folder size={36} className="text-slate-300" />
            </div>
            <h2 className="font-bold text-slate-600 text-lg mb-2">ຍັງບໍ່ມີໂຟລເດີ</h2>
            <p className="text-slate-400 text-sm max-w-xs mb-6">
              ໄປໜ້າ "ນຳເຂົ້າລູກຄ້າ" ແລ້ວ Import ໄຟລ໌ — ໂຟລເດີຈະຖືກສ້າງຂຶ້ນອັດຕະໂນມັດຫຼັງ import ສຳເລັດ
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 max-w-sm text-left">
              <p className="text-amber-800 text-xs font-semibold mb-1">ມີລູກຄ້າທີ່ import ກ່ອນໜ້ານີ້?</p>
              <p className="text-amber-700 text-xs mb-3">ກົດ "ກູ້ຄືນ" ເພື່ອສ້າງໂຟລເດີຈາກລູກຄ້າທີ່ມີຢູ່ໃນລະບົບທັງໝົດ</p>
              <button onClick={handleRecover} disabled={recovering}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-60">
                {recovering
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />ກຳລັງກູ້ຄືນ...</>
                  : <><RefreshCw size={13} />ກູ້ຄືນໂຟລເດີຈາກ DB</>}
              </button>
            </div>
          </div>
        )}

        {batches.length > 0 && (
          <>
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ຄົ້ນຫາໂຟລເດີ..."
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "ໂຟລເດີທັງໝົດ",   value: batches.length,              icon: Folder,    color: "text-[hsl(0,66%,42%)]", bg: "bg-red-50" },
                { label: "ລາຍການລູກຄ້າ",   value: totalCustomers.toLocaleString(), icon: Users, color: "text-blue-600",          bg: "bg-blue-50" },
                { label: "ໄຟລ Import",       value: batches.filter(b => b.fileName).length, icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-background border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={item.color} />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                      <p className="font-extrabold text-foreground text-lg leading-tight">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">ບໍ່ພົບໂຟລເດີ</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(b => (
                  <FolderCard key={b.id} batch={b}
                    onRename={handleRename}
                    onDelete={setDeleteTarget}
                    onView={setViewTarget}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          batch={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {viewTarget && (
        <CustomerDetailModal batch={viewTarget} onClose={() => setViewTarget(null)} />
      )}
    </div>
  );
}
