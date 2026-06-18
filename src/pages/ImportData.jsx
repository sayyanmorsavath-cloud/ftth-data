// ════════════════════════════════════════════════════════════════
// ImportData.jsx
// ໜ້ານຳເຂົ້າລູກຄ້າຈາກໄຟລ໌ Excel (bulk import)
// ─── ຮອງຮັບ 2 format: ໃໝ່ (Months+StartDate) / ເກົ່າ (Expiry)
// ════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useMemo } from "react";
import { bulkCreateCustomers } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { saveCustomerBatch, updateCustomerBatchName } from "@/lib/customerImportBatches";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  X, Download, Trash2, AlertCircle, Loader2, Info,
  TriangleAlert, Copy, FolderPlus,
} from "lucide-react";
import { format, parse, isValid, addMonths, subDays } from "date-fns";
import { CUSTOMER_TYPES } from "@/lib/customerTypes";

const REQUIRED_COLS = ["Name", "Phone", "Speed", "Months", "Start Date"];
const OPTIONAL_COLS = ["Village", "District", "User", "Type", "Installation Date", "Remarks"];

const VALID_TYPE_CODES = new Set(CUSTOMER_TYPES.map(t => t.code));

const LAO_MAP = {
  "ຊື່ລູກຄ້າ": "Name", "ເບີໂທ": "Phone", "ຄວາມໄວ": "Speed",
  "ວັນໝົດ": "Expiry", "ວັນເລີ່ມ": "Start Date", "ວັນຕິດຕັ້ງ": "Installation Date",
  "ເດືອນ": "Months", "ລະຫັດ": "User", "ທີ່ຢູ່": "Village",
  "ເມືອງ": "District", "ໝາຍເຫດ": "Remarks", "ປະເພດ": "Type",
};

const DURATION_MAP = { 1: 1, 3: 4, 6: 8, 12: 16 };

function excelSerialToDate(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return isValid(d) ? d : null;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === "number" && val > 1000 && val < 999999) {
    return excelSerialToDate(val);
  }
  const str = String(val).trim();
  if (/^\d{4,6}$/.test(str)) {
    const n = Number(str);
    if (n > 1000 && n < 999999) return excelSerialToDate(n);
  }
  const fmts = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "d/M/yy", "dd/MM/yy"];
  for (const f of fmts) {
    const d = parse(str, f, new Date());
    if (isValid(d)) return d;
  }
  const d = new Date(str);
  return isValid(d) ? d : null;
}

function calcExpiry(startDate, months) {
  if (!startDate || !months || isNaN(months) || months <= 0) return null;
  return subDays(addMonths(startDate, Number(months)), 1);
}

function validateRow(r) {
  const errs = [];
  if (!r.name?.trim()) errs.push({ field: "name", msg: "ຂາດຊື່ລູກຄ້າ" });
  if (!r.phone?.trim()) errs.push({ field: "phone", msg: "ຂາດເບີໂທ" });
  if (!r.speed?.trim()) errs.push({ field: "speed", msg: "ຂາດຄວາມໄວ" });

  const months = parseInt(String(r._rawMonths ?? "").trim(), 10);
  if (!r._rawMonths || isNaN(months) || months <= 0) {
    errs.push({ field: "months", msg: "ຈຳນວນເດືອນບໍ່ຖືກຕ້ອງ (ໃສ່: 1, 3, 6, ຫຼື 12)" });
  }
  const startDate = parseDate(r._rawStartDate);
  if (!startDate) {
    errs.push({ field: "startDate", msg: "ວັນເລີ່ມຜິດຮູບແບບ (ຕ້ອງເປັນ dd/MM/yyyy)" });
  }
  return errs;
}

function buildRow(raw, isOldFormat) {
  const months = isOldFormat ? null : parseInt(String(raw._rawMonths ?? "").trim(), 10);
  const totalMonths = DURATION_MAP[months] ?? months ?? 0;
  const startDate = isOldFormat ? null : parseDate(raw._rawStartDate);
  let expiryDate = null;

  if (isOldFormat) {
    expiryDate = parseDate(raw._rawExpiry);
  } else if (startDate && !isNaN(months) && months > 0) {
    expiryDate = calcExpiry(startDate, totalMonths);
  }

  return {
    ...raw,
    _months: months,
    _totalMonths: totalMonths,
    _startDisplay: startDate ? format(startDate, "dd/MM/yyyy") : "",
    _expiryDisplay: expiryDate ? format(expiryDate, "dd/MM/yyyy") : "",
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    expiryDate: expiryDate ? format(expiryDate, "yyyy-MM-dd") : undefined,
  };
}

// ─── Modal ຕັ້ງຊື່ໂຟລເດີ (ແທນ window.prompt) ─────────────────
function SaveFolderModal({ defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName);
  const handleConfirm = () => onConfirm(name.trim() || defaultName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(0,66%,42%)]/10 flex items-center justify-center flex-shrink-0">
            <FolderPlus size={22} className="text-[hsl(0,66%,42%)]" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">ບັນທຶກໂຟລເດີສຳເລັດ</h3>
            <p className="text-slate-500 text-xs mt-0.5">ຕັ້ງຊື່ໂຟລເດີ ຫຼື ກົດ "ຂ້າມ" ໃຊ້ຊື່ default</p>
          </div>
        </div>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") onCancel(); }}
          placeholder={defaultName}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[hsl(0,66%,42%)] text-sm font-medium focus:outline-none mb-5"
        />

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            ຂ້າມ
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] hover:bg-[hsl(0,66%,36%)] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <FolderPlus size={14} /> ບັນທຶກ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ໜ້າຫຼັກ: ImportData ─────────────────────────────────────
export default function ImportData() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [isOldFormat, setIsOldFormat] = useState(false);
  const [bulkPhone, setBulkPhone] = useState("");
  const [pendingBatch, setPendingBatch] = useState(null); // ຂໍ້ມູນ batch ລໍຖ້າຕັ້ງຊື່
  const fileRef = useRef(null);

  const qc = useQueryClient();

  const parseFile = async (file) => {
    setResults(null);
    setParseError("");
    setRows([]);
    setFileName(file.name);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const buf = await file.arrayBuffer();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) { setParseError("ບໍ່ພົບ Sheet ໃນໄຟລ໌"); return; }

      const rawHeaders = ws.getRow(1).values.slice(1);
      const colIndex = {};
      rawHeaders.forEach((h, i) => {
        if (!h) return;
        let name = String(h).trim();
        if (LAO_MAP[name]) name = LAO_MAP[name];
        colIndex[name] = i;
      });

      const oldFmt = colIndex["Expiry"] !== undefined && colIndex["Months"] === undefined;
      setIsOldFormat(oldFmt);

      const reqCheck = oldFmt ? ["Name", "Phone", "Speed", "Expiry"] : REQUIRED_COLS;
      const missing = reqCheck.filter(c => colIndex[c] === undefined);
      if (missing.length > 0) {
        setParseError(`ຂາດຖັນທີ່ຈຳເປັນ: ${missing.join(", ")}`);
        return;
      }

      const parsed = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const vals = row.values.slice(1);
        const get = (col) => {
          const idx = colIndex[col];
          if (idx === undefined) return "";
          const v = vals[idx];
          if (v === null || v === undefined) return "";
          if (v instanceof Date) return v;
          if (typeof v === "object" && v.text) return String(v.text).trim();
          if (typeof v === "object" && v.result !== undefined) return String(v.result).trim();
          return String(v).trim();
        };

        const name = String(get("Name") || "").trim();
        const phone = String(get("Phone") || "").trim();
        if (!name && !phone) return;

        const village = String(get("Village") || "").trim();
        const district = String(get("District") || "").trim();
        const address = [village, district].filter(Boolean).join(", ") || "—";
        const installRaw = get("Installation Date");
        const installDate = parseDate(installRaw);

        const rawType = String(get("Type") || "").trim().toUpperCase();
        const customerType = VALID_TYPE_CODES.has(rawType) ? rawType : "IN";

        const rawRow = {
          _id: `row-${rowNum}`,
          _rowNum: rowNum,
          _rawMonths: String(get("Months") || "").trim(),
          _rawStartDate: get("Start Date"),
          _rawExpiry: get("Expiry"),
          _installDisplay: installDate ? format(installDate, "dd/MM/yyyy") : "",
          name,
          phone,
          speed: String(get("Speed") || "").trim(),
          installationDate: installDate ? format(installDate, "yyyy-MM-dd") : undefined,
          accountId: String(get("User") || "").trim() || undefined,
          address,
          city: district || undefined,
          customerType,
          vip: false,
          status: "active",
          remarks: String(get("Remarks") || "").trim() || undefined,
        };

        const built = buildRow(rawRow, oldFmt);
        const errs = oldFmt ? [] : validateRow(built);
        parsed.push({ ...built, _errs: errs, _wasInvalid: errs.length > 0 });
      });

      setRows(parsed);
    } catch (e) {
      setParseError(`ອ່ານໄຟລ໌ບໍ່ໄດ້: ${e.message}`);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError("ຮອງຮັບສະເພາະໄຟລ໌ .xlsx ຫຼື .xls");
      return;
    }
    parseFile(file);
  };

  // Directly update a field on an error row and re-validate
  const handleFieldChange = useCallback((rowId, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== rowId) return r;
      const updated = { ...r, [field]: value };
      const built = buildRow(updated, isOldFormat);
      const errs = isOldFormat ? [] : validateRow(built);
      return { ...built, _errs: errs, _wasInvalid: r._wasInvalid };
    }));
  }, [isOldFormat]);

  const removeRow = useCallback((rowId) => {
    setRows(prev => prev.filter(r => r._id !== rowId));
  }, []);

  const removeAllDups = useCallback(() => {
    setRows(prev => {
      const seen = new Set();
      return prev.filter(r => {
        if (!r.accountId) return true;
        if (seen.has(r.accountId)) return false;
        seen.add(r.accountId);
        return true;
      });
    });
  }, []);

  const fillAllEmptyPhones = useCallback((value) => {
    if (!value.trim()) return;
    setRows(prev => prev.map(r => {
      if (r._errs.length === 0) return r;
      if (r.phone?.trim()) return r;
      const updated = { ...r, phone: value.trim() };
      const built = buildRow(updated, isOldFormat);
      const errs = isOldFormat ? [] : validateRow(built);
      return { ...built, _errs: errs };
    }));
  }, [isOldFormat]);

  const fillAllEmpty = useCallback(() => {
    const today = format(new Date(), "dd/MM/yyyy");
    setRows(prev => prev.map(r => {
      if (r._errs.length === 0) return r;
      const updated = {
        ...r,
        name:           r.name?.trim()          ? r.name          : "-",
        phone:          r.phone?.trim()          ? r.phone         : "-",
        speed:          r.speed?.trim()          ? r.speed         : "-",
        _rawMonths:     r._rawMonths?.trim()     ? r._rawMonths    : "1",
        _rawStartDate:  r._rawStartDate && parseDate(r._rawStartDate)
                          ? r._rawStartDate
                          : today,
      };
      const built = buildRow(updated, isOldFormat);
      const errs = isOldFormat ? [] : validateRow(built);
      return { ...built, _errs: errs };
    }));
  }, [isOldFormat]);

  // Computed duplicate groups (rows sharing the same accountId)
  const dupGroups = useMemo(() => {
    const groups = {};
    rows.forEach(r => {
      if (!r.accountId) return;
      if (!groups[r.accountId]) groups[r.accountId] = [];
      groups[r.accountId].push(r);
    });
    return Object.entries(groups).filter(([, rs]) => rs.length > 1);
  }, [rows]);

  const handleImport = async () => {
    const toImport = rows.filter(r => r._errs.length === 0);
    if (toImport.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: toImport.length });

    const dataList = toImport.map(r => {
      const { _id, _rowNum, _errs, _wasInvalid, _startDisplay, _expiryDisplay, _installDisplay,
              _months, _totalMonths, _rawMonths, _rawStartDate, _rawExpiry, ...data } = r;
      return data;
    });

    const { success, failed, failedIndexes, lastError, insertedIds } = await bulkCreateCustomers(dataList, {
      onProgress: ({ done, total }) => setImportProgress({ done, total }),
    });

    const failedRows = failedIndexes.map(i => toImport[i]?._rowNum).filter(Boolean);

    setImporting(false);
    setImportProgress(null);
    setResults({ success, failed, total: toImport.length, failedRows, errorMsg: lastError?.message ?? null });
    qc.invalidateQueries();

    if (success > 0) {
      // ─── Save batch ທັນທີດ້ວຍຊື່ default (ບໍ່ລໍຖ້າ modal) ───
      const defaultName = fileName
        ? fileName.replace(/\.(xlsx|xls)$/i, "") + " — " + format(new Date(), "dd/MM/yyyy HH:mm")
        : "Import " + format(new Date(), "dd/MM/yyyy HH:mm");
      const batchId = crypto.randomUUID();
      await saveCustomerBatch({
        id:          batchId,
        name:        defaultName,
        fileName:    fileName || "",
        importedAt:  new Date().toISOString(),
        count:       success,
        customerIds: insertedIds ?? [],
      });
      // ─── ເປີດ modal ໃຫ້ rename (ບໍ່ແມ່ນ save ຄັ້ງທຳອິດ) ───
      setPendingBatch({
        batchId,
        defaultName,
        fileName:   fileName || "",
        importedAt: new Date().toISOString(),
        count:      success,
        customerIds: insertedIds ?? [],
        failedRows,
      });
    }
  };

  // ─── ຮັບຊື່ໃໝ່ຈາກ modal — rename batch ທີ່ save ໄວ້ແລ້ວ ───
  const handleSaveBatch = async (batchName) => {
    if (pendingBatch) {
      await updateCustomerBatchName(pendingBatch.batchId, batchName);
      setRows(prev => prev.filter(r => r._errs.length > 0 || pendingBatch.failedRows.includes(r._rowNum)));
    }
    setPendingBatch(null);
  };

  // ─── ຂ້າມ rename — batch ຍັງ save ດ້ວຍຊື່ default ──────────
  const handleSkipBatch = () => {
    if (pendingBatch) {
      setRows(prev => prev.filter(r => r._errs.length > 0 || pendingBatch.failedRows.includes(r._rowNum)));
    }
    setPendingBatch(null);
  };

  const validRows = rows.filter(r => r._errs.length === 0);
  // Rows that had errors on parse — stay visible until import even after fixing
  const invalidRows = rows.filter(r => r._wasInvalid);
  const stillErrCount = invalidRows.filter(r => r._errs.length > 0).length;
  const hasDups = dupGroups.length > 0;

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Upload size={22} className="text-[hsl(0,66%,42%)]" /> ນຳເຂົ້າຂໍ້ມູນ
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">ນຳເຂົ້າລູກຄ້າຈາກໄຟລ໌ Excel — ແກ້ໄຂ error ໄດ້ທັນທີໃນຕາຕະລາງ</p>
        </div>
        <a
          href="/template_import.xlsx"
          download="template_import.xlsx"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <Download size={15} /> ດາວໂຫຼດ Template
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-1">
          <div><span className="font-semibold">ຖັນຈຳເປັນ:</span> {REQUIRED_COLS.join(", ")}</div>
          <div><span className="font-semibold">ຖັນທາງເລືອກ:</span> {OPTIONAL_COLS.join(", ")}</div>
          <div>Start Date: dd/MM/yyyy &nbsp;|&nbsp; Months: 1, 3, 6, ຫຼື 12</div>
          <div><span className="font-semibold">Type</span> (ປະເພດລູກຄ້າ): {CUSTOMER_TYPES.map(t => `${t.code}`).join(", ")} — ຖ້າຫວ່າງໃຊ້ IN</div>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging ? "border-[hsl(0,66%,42%)] bg-red-50" : "border-border hover:border-[hsl(0,66%,42%)] hover:bg-muted/30"
        }`}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        <FileSpreadsheet size={36} className={`mx-auto mb-3 ${dragging ? "text-[hsl(0,66%,42%)]" : "text-muted-foreground"}`} />
        {fileName ? (
          <div>
            <div className="font-semibold text-foreground text-sm">{fileName}</div>
            <div className="text-xs text-muted-foreground mt-1">ກົດເພື່ອປ່ຽນໄຟລ໌</div>
          </div>
        ) : (
          <div>
            <div className="font-semibold text-foreground text-sm">ລາກໄຟລ໌ Excel ມາວາງ ຫຼື ກົດເພື່ອເລືອກ</div>
            <div className="text-xs text-muted-foreground mt-1">ຮອງຮັບ .xlsx, .xls</div>
          </div>
        )}
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-red-700 text-sm">ບໍ່ສາມາດອ່ານໄຟລ໌</div>
            <div className="text-xs text-red-600 mt-0.5">{parseError}</div>
          </div>
        </div>
      )}

      {hasDups && (
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={17} className="text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  ພົບ Account ID ຊ້ຳກັນ
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                    {dupGroups.length} ກຸ່ມ
                  </span>
                </div>
                <div className="text-xs text-amber-600 mt-0.5">ເກັບໄວ້ລາຍການທຳອິດ ແລ້ວລຶບລາຍການທີ່ຊ້ຳອອກ</div>
              </div>
            </div>
            <button
              onClick={removeAllDups}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold transition-all shadow-sm flex-shrink-0"
            >
              <Trash2 size={14} />
              ລຶບທີ່ຊ້ຳທັງໝົດ
            </button>
          </div>

          {/* Groups */}
          <div className="divide-y divide-amber-100">
            {dupGroups.map(([accountId, groupRows]) => (
              <div key={accountId} className="p-4 space-y-3">
                {/* Group label */}
                <div className="flex items-center gap-2">
                  <Copy size={12} className="text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ລະຫັດ</span>
                  <span className="font-mono text-sm font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">{accountId}</span>
                  <span className="text-xs text-muted-foreground">({groupRows.length} ລາຍການ)</span>
                </div>

                {/* Rows */}
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  {groupRows.map((r, idx) => (
                    <div key={r._id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                      idx !== groupRows.length - 1 ? "border-b border-amber-100" : ""
                    } ${idx === 0 ? "bg-white" : "bg-amber-50/50"}`}>
                      <span className="font-mono text-xs text-muted-foreground w-12 flex-shrink-0">
                        ແຖວ {r._rowNum}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                          ທຳອິດ
                        </span>
                      )}
                      <span className="font-medium text-foreground flex-1 truncate min-w-0">{r.name || "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{r.phone || "—"}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 w-24 text-right hidden sm:block">{r._startDisplay || "—"}</span>
                      <button
                        onClick={() => removeRow(r._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex-shrink-0"
                      >
                        <Trash2 size={11} /> ລຶບ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${results.success === 0 ? "bg-red-50 border-red-200" : results.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          <CheckCircle2 size={18} className={`mt-0.5 flex-shrink-0 ${results.success === 0 ? "text-red-600" : results.failed > 0 ? "text-amber-600" : "text-emerald-600"}`} />
          <div className="min-w-0 flex-1">
            <div className={`font-semibold text-sm ${results.success === 0 ? "text-red-700" : results.failed > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              ນຳເຂົ້າສຳເລັດ {results.success.toLocaleString()} / {results.total.toLocaleString()} ລາຍການ
            </div>
            {results.failed > 0 && results.failedRows.length > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                ຜິດພາດ {results.failed} ລາຍການ · ແຖວ: {results.failedRows.slice(0, 20).join(", ")}
                {results.failedRows.length > 20 && ` ... ແລະອີກ ${results.failedRows.length - 20} ແຖວ`}
              </div>
            )}
            {results.errorMsg && (
              <div className="text-xs text-red-600 bg-red-100 border border-red-200 rounded-lg px-3 py-2 mt-2 font-mono break-all">
                ❌ {results.errorMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Summary + import button */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{rows.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">ທັງໝົດ</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{validRows.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center">
                    <CheckCircle2 size={10} className="text-emerald-500" /> ພ້ອມນຳເຂົ້າ
                  </div>
                </div>
                {invalidRows.length > 0 && (
                  <>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${stillErrCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {stillErrCount > 0 ? stillErrCount : "✓"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center">
                        {stillErrCount > 0
                          ? <><AlertTriangle size={10} className="text-red-500" /> ຕ້ອງແກ້ໄຂ</>
                          : <><CheckCircle2 size={10} className="text-emerald-500" /> ແກ້ໄຂແລ້ວ</>
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setRows([]); setFileName(""); setParseError(""); setResults(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Trash2 size={13} /> ລ້າງ
                </button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || importing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(0,66%,42%)] text-white text-sm font-semibold hover:bg-[hsl(0,66%,35%)] transition-colors disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {importProgress ? `${importProgress.done}/${importProgress.total}...` : "ນຳເຂົ້າ..."}
                    </>
                  ) : (
                    <><Upload size={14} /> ນຳເຂົ້າ {validRows.length} ລາຍການ</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error rows — all editable at once */}
          {invalidRows.length > 0 && (
            <div className="bg-card rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${stillErrCount > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {stillErrCount > 0
                    ? <TriangleAlert size={15} className="text-red-600 flex-shrink-0" />
                    : <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  }
                  <span className={`font-semibold text-sm ${stillErrCount > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {stillErrCount > 0
                      ? `${stillErrCount} ແຖວຍັງຕ້ອງແກ້ໄຂ — ພິມໄດ້ທຸກຊ່ອງໂດຍກົງ ແລ້ວກົດ "ນຳເຂົ້າ"`
                      : `ທຸກແຖວຖືກຕ້ອງແລ້ວ — ກົດ "ນຳເຂົ້າ" ໄດ້ເລີຍ`
                    }
                  </span>
                </div>
                {stillErrCount > 0 && (
                  <button
                    onClick={fillAllEmpty}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap shadow-sm"
                    title="ຕື່ມ (-) ໃຫ້ທຸກ field ທີ່ຫວ່າງ ແລ້ວໃຊ້ 1 ເດືອນ / ວັນນີ້ ເປັນ default"
                  >
                    ✦ ຕື່ມ (−) ທຸກຊ່ອງວ່າງ
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-12">ແຖວ</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[140px]">ຊື່</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[180px]">ເບີໂທ</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[90px]">ຄວາມໄວ</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[110px]">ວັນເລີ່ມ</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap min-w-[80px]">ເດືອນ</th>
                      <th className="text-left px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">ຂໍ້ຜິດພາດ</th>
                    </tr>
                    {/* Bulk-fill row for phone */}
                    <tr className="bg-blue-50 border-b border-blue-200">
                      <td colSpan={2} className="px-3 py-2 text-xs text-blue-700 font-semibold whitespace-nowrap">
                        ໃສ່ຄັ້ງດຽວ ລົງທຸກແຖວ:
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={bulkPhone}
                            onChange={e => setBulkPhone(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && bulkPhone.trim()) {
                                fillAllEmptyPhones(bulkPhone);
                                setBulkPhone("");
                              }
                            }}
                            className="flex-1 rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300 placeholder:text-blue-300"
                            placeholder="ໃສ່ເບີ ກົດ Enter..."
                          />
                          <button
                            onClick={() => { fillAllEmptyPhones(bulkPhone); setBulkPhone(""); }}
                            disabled={!bulkPhone.trim()}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                          >
                            ລົງທຸກແຖວ
                          </button>
                        </div>
                      </td>
                      <td colSpan={4} className="px-3 py-2 text-[11px] text-blue-500 italic">
                        ຈະໃສ່ສະເພາະແຖວທີ່ຍັງຂາດເບີໂທ
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {invalidRows.map((r) => {
                      const errFields = new Set(r._errs.map(e => e.field));
                      const isFixed = r._errs.length === 0;
                      return (
                        <tr key={r._id} className={`border-b border-border last:border-0 transition-colors ${isFixed ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "bg-red-50/20 hover:bg-red-50/40"}`}>
                          <td className={`px-3 py-2 text-xs font-bold font-mono ${isFixed ? "text-emerald-500" : "text-red-400"}`}>{r._rowNum}</td>

                          {/* Name */}
                          <td className="px-3 py-2">
                            <input
                              value={r.name ?? ""}
                              onChange={e => handleFieldChange(r._id, "name", e.target.value)}
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                                errFields.has("name") && !r.name?.trim()
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-border bg-white focus:border-[hsl(0,66%,42%)] focus:ring-[hsl(0,66%,42%)]/20"
                              }`}
                              placeholder="ຊື່ລູກຄ້າ..."
                            />
                          </td>

                          {/* Phone */}
                          <td className="px-3 py-2">
                            <input
                              value={r.phone ?? ""}
                              onChange={e => handleFieldChange(r._id, "phone", e.target.value)}
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                                errFields.has("phone") && !r.phone?.trim()
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-border bg-white focus:border-[hsl(0,66%,42%)] focus:ring-[hsl(0,66%,42%)]/20"
                              }`}
                              placeholder="ເບີໂທ..."
                            />
                          </td>

                          {/* Speed */}
                          <td className="px-3 py-2">
                            <input
                              value={r.speed ?? ""}
                              onChange={e => handleFieldChange(r._id, "speed", e.target.value)}
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                                errFields.has("speed") && !r.speed?.trim()
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-border bg-white focus:border-[hsl(0,66%,42%)] focus:ring-[hsl(0,66%,42%)]/20"
                              }`}
                              placeholder="ເຊັ່ນ: 30M"
                            />
                          </td>

                          {/* Start Date */}
                          <td className="px-3 py-2">
                            <input
                              value={
                                r._rawStartDate instanceof Date
                                  ? format(r._rawStartDate, "dd/MM/yyyy")
                                  : String(r._rawStartDate || "")
                              }
                              onChange={e => handleFieldChange(r._id, "_rawStartDate", e.target.value)}
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                                errFields.has("startDate") && !parseDate(r._rawStartDate)
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-border bg-white focus:border-[hsl(0,66%,42%)] focus:ring-[hsl(0,66%,42%)]/20"
                              }`}
                              placeholder="dd/MM/yyyy"
                            />
                          </td>

                          {/* Months */}
                          <td className="px-3 py-2">
                            <select
                              value={r._rawMonths ?? ""}
                              onChange={e => handleFieldChange(r._id, "_rawMonths", e.target.value)}
                              className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 ${
                                errFields.has("months") && !r._rawMonths
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-border bg-white focus:border-[hsl(0,66%,42%)] focus:ring-[hsl(0,66%,42%)]/20"
                              }`}
                            >
                              <option value="">—</option>
                              {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>

                          {/* Errors / Fixed status */}
                          <td className="px-3 py-2">
                            {isFixed
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                  <CheckCircle2 size={10} /> ຖືກຕ້ອງ
                                </span>
                              : <div className="flex flex-wrap gap-1">
                                  {r._errs.map((e, i) => (
                                    <span key={i} className="text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                      {e.msg}
                                    </span>
                                  ))}
                                </div>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {invalidRows.length === 0 && validRows.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-emerald-700 text-sm">ຂໍ້ມູນທຸກແຖວຖືກຕ້ອງ!</div>
                <div className="text-xs text-emerald-600 mt-0.5">ກົດ "ນຳເຂົ້າ {validRows.length} ລາຍການ" ໄດ້ເລີຍ</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal ຕັ້ງຊື່ໂຟລເດີ ─────────────────────────── */}
      {pendingBatch && (
        <SaveFolderModal
          defaultName={pendingBatch.defaultName}
          onConfirm={handleSaveBatch}
          onCancel={handleSkipBatch}
        />
      )}
    </div>
  );
}
