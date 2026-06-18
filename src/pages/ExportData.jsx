import { useState, useMemo } from "react";
import { CUSTOMER_TYPES as CUST_TYPE_LIST } from "@/lib/customerTypes";
import {
  Download, CheckCircle2, Loader2,
  Users, Wifi, BarChart2, Table2, Star, AlertTriangle,
  Filter, X, SlidersHorizontal, ChevronDown, ChevronUp,
  Clock, TrendingUp, FileDown, Layers, Zap,
} from "lucide-react";
import {
  useListCustomers,
  useListPackages,
  useGetDashboardSummary,
  useGetCustomersByPackage,
} from "@/lib/store";
import { format, differenceInDays, parseISO } from "date-fns";
import ExcelJS from "exceljs";

const RED_HEX   = "C62828";
const RED_LIGHT = "FDECEA";
const RED_MID   = "FFCDD2";
const AMBER     = "FFF8E1";
const GREEN_LIGHT = "E8F5E9";
const BLUE_LIGHT  = "E3F2FD";
const GREY  = "F5F5F5";
const WHITE = "FFFFFF";

const STATUS_OPTIONS = [
  { value: "active",    label: "ໃຊ້ງານ",     color: "bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  { value: "inactive",  label: "ບໍ່ໃຊ້ງານ",  color: "bg-gray-100 text-gray-600 border-gray-300",         dot: "bg-gray-400" },
  { value: "suspended", label: "ຖືກລະງັບ",   color: "bg-orange-100 text-orange-700 border-orange-300",   dot: "bg-orange-500" },
  { value: "expired",   label: "ໝົດອາຍຸ",    color: "bg-red-100 text-red-700 border-red-300",             dot: "bg-red-500" },
];

const TYPE_OPTIONS = CUST_TYPE_LIST.map(t => ({ value: t.code, label: `${t.code} – ${t.label}`, icon: t.emoji }));

function headerRow(ws, rowNum, cols) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  cols.forEach((h, i) => {
    const cell = ws.getCell(rowNum, i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const s = { style: "thin", color: { argb: "FF" + RED_HEX } };
    cell.border = { top: s, left: s, bottom: s, right: s };
  });
}

function dataCell(ws, row, col, value, bg) {
  const cell = ws.getCell(row, col);
  cell.value = value ?? "";
  cell.font = { name: "Calibri", size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
  cell.alignment = { vertical: "middle", wrapText: false };
  const s = { style: "hair", color: { argb: "FFE0E0E0" } };
  cell.border = { top: s, left: s, bottom: s, right: s };
  return cell;
}

function addTitleBlock(ws, title, cols, dateStr) {
  ws.mergeCells(1, 1, 1, cols);
  const t1 = ws.getCell(1, 1);
  t1.value = "FTTH WiFi — ລະບົບຈັດການລູກຄ້າ";
  t1.font = { name: "Calibri", bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, cols);
  const t2 = ws.getCell(2, 1);
  t2.value = title;
  t2.font = { name: "Calibri", bold: true, size: 12, color: { argb: "FF" + RED_HEX } };
  t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_LIGHT } };
  t2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  ws.mergeCells(3, 1, 3, cols);
  const t3 = ws.getCell(3, 1);
  t3.value = `ສ້າງເມື່ອ: ${dateStr}`;
  t3.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF757575" } };
  t3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
  t3.alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(3).height = 16;

  ws.mergeCells(4, 1, 4, cols);
  ws.getRow(4).height = 6;
}

export default function ExportData() {
  const [exporting, setExporting] = useState(null);
  const [done, setDone]           = useState(null);
  const [exportError, setExportError] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  const [selStatuses, setSelStatuses] = useState([]);
  const [selTypes,    setSelTypes]    = useState([]);
  const [selPackages, setSelPackages] = useState([]);
  const [vipOnly,     setVipOnly]     = useState(false);

  const { data: _custPage } = useListCustomers({ pageSize: 10000 });
  const customers  = _custPage?.data ?? [];
  const { data: packages = [] }  = useListPackages();
  const { data: summary }        = useGetDashboardSummary();
  const { data: byPackage = [] } = useGetCustomersByPackage();

  const now     = new Date();
  const dateStr = format(now, "dd/MM/yyyy HH:mm");
  const fileDate = format(now, "yyyyMMdd");

  const filtered = useMemo(() => {
    return customers.filter(c => {
      if (selStatuses.length > 0 && !selStatuses.includes(c.status)) return false;
      if (selTypes.length > 0    && !selTypes.includes(c.customerType)) return false;
      if (selPackages.length > 0 && (c.packageId == null || !selPackages.includes(c.packageId))) return false;
      if (vipOnly && !c.vip) return false;
      return true;
    });
  }, [customers, selStatuses, selTypes, selPackages, vipOnly]);

  const hasFilter = selStatuses.length > 0 || selTypes.length > 0 || selPackages.length > 0 || vipOnly;
  const filterCount = selStatuses.length + selTypes.length + selPackages.length + (vipOnly ? 1 : 0);

  function clearFilters() { setSelStatuses([]); setSelTypes([]); setSelPackages([]); setVipOnly(false); }
  function toggle(arr, val, set) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function exportCustom() {
    setExporting("custom");
    setExportError(null);
    try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "LTC FTTH Tracker"; wb.created = now;
    const filterDesc = [];
    if (selStatuses.length > 0) filterDesc.push(`ສະຖານະ: ${selStatuses.map(s => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s).join(", ")}`);
    if (selTypes.length > 0)    filterDesc.push(`ປະເພດ: ${selTypes.join(", ")}`);
    if (selPackages.length > 0) filterDesc.push(`ແພັກ: ${selPackages.map(id => packages.find(p => p.id === id)?.name ?? id).join(", ")}`);
    if (vipOnly) filterDesc.push("VIP ເທົ່ານັ້ນ");
    const ws = wb.addWorksheet("Filtered Customers", { properties: { tabColor: { argb: "FF" + RED_HEX } } });
    const COLS = ["#", "Account ID", "ຊື່", "ເບີໂທ", "ທີ່ຢູ່", "ເມືອງ", "ປະເພດ", "VIP", "ແພັກເກດ", "ຄວາມໄວ", "ສະຖານະ", "ວັນຕິດຕັ້ງ", "ວັນເລີ່ມ", "ວັນໝົດ", "ວັນເຫຼືອ", "ຕິດຕາມ", "ຜູ້ຕິດຕາມ", "ໝາຍເຫດ"];
    ws.columns = [{ width: 5 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 26 }, { width: 12 }, { width: 13 }, { width: 5 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 10 }, { width: 14 }, { width: 16 }, { width: 24 }];
    addTitleBlock(ws, hasFilter ? `ລາຍງານກອງ: ${filterDesc.join(" | ")}` : "ລາຍງານລູກຄ້າທັງໝົດ", COLS.length, dateStr);
    headerRow(ws, 5, COLS);
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS.length } };
    filtered.forEach((c, i) => {
      const r = i + 6;
      const bg = i % 2 === 0 ? WHITE : GREY;
      const days = differenceInDays(parseISO(c.expiryDate), now);
      const urgentBg = days < 0 ? RED_LIGHT : days <= 7 ? AMBER : bg;
      const pkg = packages.find(p => p.id === c.packageId);
      ws.getRow(r).height = 18;
      const vals = [i + 1, c.accountId ?? "", c.name, c.phone, c.address, c.city ?? "", c.customerType, c.vip ? "★" : "", pkg?.name ?? "", c.speed, STATUS_OPTIONS.find(s => s.value === c.status)?.label ?? c.status, c.installationDate ? format(parseISO(c.installationDate), "dd/MM/yyyy") : "", c.startDate ? format(parseISO(c.startDate), "dd/MM/yyyy") : "", format(parseISO(c.expiryDate), "dd/MM/yyyy"), days, c.followUpStatus ?? "", c.followUpPerson ?? "", c.remarks ?? ""];
      vals.forEach((v, ci) => {
        const cell = dataCell(ws, r, ci + 1, v, ci === 13 ? urgentBg : bg);
        if (ci === 0) { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.font = { bold: true, size: 10, name: "Calibri" }; }
        if (ci === 2) cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF222222" } };
        if (ci === 7 && c.vip) cell.font = { bold: true, size: 12, name: "Calibri", color: { argb: "FFF59E0B" } };
        if (ci === 10) { const colors = { ໃຊ້ງານ: "2E7D32", ບໍ່ໃຊ້ງານ: "757575", ຖືກລະງັບ: "E65100", ໝົດອາຍຸ: RED_HEX }; cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF" + (colors[String(v)] ?? "000000") } }; }
        if (ci === 14) { const color = days < 0 ? RED_HEX : days <= 7 ? "E65100" : "2E7D32"; cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF" + color } }; cell.alignment = { horizontal: "center", vertical: "middle" }; }
      });
    });
    const lastRow = filtered.length + 6;
    ws.mergeCells(lastRow, 1, lastRow, COLS.length);
    const fCell = ws.getCell(lastRow, 1);
    fCell.value = `ທັງໝົດ: ${filtered.length} ລູກຄ້າ${hasFilter ? ` (ກອງຈາກ ${customers.length})` : ""}`;
    fCell.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
    fCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
    fCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(lastRow).height = 22;
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `FTTH_ລູກຄ້າ${hasFilter ? "_ກອງ" : ""}_${fileDate}.xlsx`; a.click();
    setDone("custom"); setTimeout(() => setDone(null), 4000);
    } catch (err) {
      setExportError("ດາວໂຫລດຜິດພາດ: " + (err?.message ?? "ກະລຸນາລອງໃໝ່"));
    } finally {
      setExporting(null);
    }
  }

  async function exportFull() {
    setExporting("full");
    setExportError(null);
    try {
    const wb = new ExcelJS.Workbook(); wb.creator = "LTC FTTH Tracker"; wb.created = now;
    const ws1 = wb.addWorksheet("All Customers", { properties: { tabColor: { argb: "FF" + RED_HEX } } });
    const COLS = ["#", "Account ID", "Full Name", "Phone", "Address", "City", "Type", "VIP", "Speed", "Status", "Install Date", "Start Date", "Expiry Date", "Bonus Month", "Follow Up", "Assigned To", "Remarks"];
    ws1.columns = [{ width: 5 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 26 }, { width: 12 }, { width: 13 }, { width: 5 }, { width: 12 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 14 }, { width: 16 }, { width: 24 }];
    addTitleBlock(ws1, "All Customers Report", COLS.length, dateStr);
    headerRow(ws1, 5, COLS);
    ws1.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS.length } };
    customers.forEach((c, i) => {
      const r = i + 6; const bg = i % 2 === 0 ? WHITE : GREY;
      const days = differenceInDays(parseISO(c.expiryDate), now);
      const urgentBg = days < 0 ? RED_LIGHT : days <= 7 ? AMBER : bg;
      ws1.getRow(r).height = 18;
      const vals = [i + 1, c.accountId ?? "", c.name, c.phone, c.address, c.city ?? "", c.customerType, c.vip ? "★" : "", c.speed, c.status, c.installationDate ? format(parseISO(c.installationDate), "dd/MM/yyyy") : "", c.startDate ? format(parseISO(c.startDate), "dd/MM/yyyy") : "", format(parseISO(c.expiryDate), "dd/MM/yyyy"), c.bonusMonthUsed ? "Used" : "No", c.followUpStatus ?? "", c.followUpPerson ?? "", c.remarks ?? ""];
      vals.forEach((v, ci) => {
        const cell = dataCell(ws1, r, ci + 1, v, ci === 12 ? urgentBg : bg);
        if (ci === 0) { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.font = { bold: true, size: 10, name: "Calibri" }; }
        if (ci === 2) cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF222222" } };
        if (ci === 7 && c.vip) cell.font = { bold: true, size: 12, name: "Calibri", color: { argb: "FFF59E0B" } };
        if (ci === 9) { const colors = { active: "2E7D32", inactive: "757575", suspended: "E65100", expired: RED_HEX }; cell.font = { bold: true, size: 10, name: "Calibri", color: { argb: "FF" + (colors[c.status] ?? "000000") } }; }
      });
    });
    const lastRow1 = customers.length + 6;
    ws1.mergeCells(lastRow1, 1, lastRow1, COLS.length);
    const fCell1 = ws1.getCell(lastRow1, 1);
    fCell1.value = `Total: ${customers.length} customers`; fCell1.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
    fCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } }; fCell1.alignment = { horizontal: "center", vertical: "middle" };
    ws1.getRow(lastRow1).height = 22;

    const ws2 = wb.addWorksheet("By Package", { properties: { tabColor: { argb: "FF1565C0" } } });
    ws2.columns = [{ width: 5 }, { width: 28 }, { width: 12 }, { width: 14 }, { width: 22 }, { width: 12 }, { width: 12 }];
    addTitleBlock(ws2, "Summary by Package", 7, dateStr);
    headerRow(ws2, 5, ["#", "Package Name", "Speed", "Monthly Fee (LAK)", "Monthly Revenue (LAK)", "Customers", "Share (%)"]);
    ws2.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 7 } };
    const totalCust = byPackage.reduce((s, p) => s + p.customerCount, 0);
    byPackage.forEach((p, i) => {
      const r = i + 6; const bg = i % 2 === 0 ? WHITE : BLUE_LIGHT;
      ws2.getRow(r).height = 20;
      const pct = totalCust ? Math.round(p.customerCount / totalCust * 100) : 0;
      const pkg = packages.find(pk => pk.id === p.packageId);
      const vals = [i + 1, p.packageName, p.speed, pkg?.price ?? 0, p.revenue, p.customerCount, `${pct}%`];
      vals.forEach((v, ci) => {
        const cell = dataCell(ws2, r, ci + 1, v, bg);
        if (ci === 0) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (ci === 1) cell.font = { bold: true, name: "Calibri", size: 10 };
        if (ci === 2) cell.font = { bold: true, name: "Calibri", size: 10, color: { argb: "FF" + RED_HEX } };
        if ([3, 4].includes(ci)) { cell.numFmt = '#,##0'; cell.alignment = { horizontal: "right", vertical: "middle" }; }
        if (ci === 5) { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.font = { bold: true, name: "Calibri", size: 10 }; }
        if (ci === 6) cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });
    const pr = byPackage.length + 6; ws2.getRow(pr).height = 22;
    const totalR = byPackage.reduce((s, p) => s + p.revenue, 0);
    ["Total", "", "", "", totalR, totalCust, "100%"].forEach((v, i) => {
      const cell = ws2.getCell(pr, i + 1);
      cell.value = v; cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + RED_HEX } };
      if (i === 4) cell.numFmt = '#,##0';
      cell.alignment = { horizontal: i === 0 ? "center" : i >= 4 ? "right" : "left", vertical: "middle" };
    });

    const ws3 = wb.addWorksheet("Statistics", { properties: { tabColor: { argb: "FF2E7D32" } } });
    ws3.columns = [{ width: 30 }, { width: 20 }];
    addTitleBlock(ws3, "Overall Statistics", 2, dateStr);
    headerRow(ws3, 5, ["Metric", "Value"]);
    const stats = [
      ["Total Customers", summary?.totalCustomers ?? 0, WHITE],
      ["Active Customers", summary?.activeCustomers ?? 0, GREEN_LIGHT],
      ["Inactive Customers", summary?.inactiveCustomers ?? 0, GREY],
      ["Suspended Customers", summary?.suspendedCustomers ?? 0, AMBER],
      ["Expired Customers", summary?.expiredCustomers ?? 0, RED_LIGHT],
      ["Expiring Soon (≤30d)", summary?.expiringSoon ?? 0, AMBER],
      ["VIP Customers", summary?.vipCustomers ?? 0, AMBER],
      ["Monthly Revenue (LAK)", summary?.totalMonthlyRevenue ?? 0, GREEN_LIGHT],
    ];
    stats.forEach(([label, val, bg], i) => {
      const r = i + 6; ws3.getRow(r).height = 20;
      const lc = ws3.getCell(r, 1); lc.value = label; lc.font = { name: "Calibri", size: 11 }; lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } }; lc.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "hair" } }; lc.alignment = { vertical: "middle" };
      const vc = ws3.getCell(r, 2); vc.value = val; vc.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF" + (i === 0 ? RED_HEX : "222222") } }; vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } }; vc.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "thin" } }; vc.alignment = { horizontal: "right", vertical: "middle" };
      if (i === 7) vc.numFmt = '#,##0';
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `FTTH_ລາຍງານລູກຄ້າ_${fileDate}.xlsx`; a.click();
    setDone("full"); setTimeout(() => setDone(null), 4000);
    } catch (err) {
      setExportError("ດາວໂຫລດຜິດພາດ: " + (err?.message ?? "ກະລຸນາລອງໃໝ່"));
    } finally {
      setExporting(null);
    }
  }

  async function exportExpiring() {
    setExporting("expiring");
    setExportError(null);
    try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Expiring Customers", { properties: { tabColor: { argb: "FFE65100" } } });
    const COLS = ["#", "Full Name", "Phone", "Address", "Speed", "Status", "Expiry Date", "Days Remaining", "Follow Up Person", "Remarks"];
    ws.columns = [{ width: 5 }, { width: 26 }, { width: 14 }, { width: 24 }, { width: 12 }, { width: 12 }, { width: 13 }, { width: 14 }, { width: 16 }, { width: 24 }];
    addTitleBlock(ws, "Expiring & Expired Customers Report", COLS.length, dateStr);
    headerRow(ws, 5, COLS);
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS.length } };
    const urgent = [...customers].filter(c => differenceInDays(parseISO(c.expiryDate), now) <= 30).sort((a, b) => differenceInDays(parseISO(a.expiryDate), now) - differenceInDays(parseISO(b.expiryDate), now));
    urgent.forEach((c, i) => {
      const days = differenceInDays(parseISO(c.expiryDate), now);
      const bg = days < 0 ? RED_LIGHT : days <= 3 ? RED_MID : days <= 7 ? AMBER : WHITE;
      ws.getRow(i + 6).height = 19;
      const vals = [i + 1, c.name, c.phone, c.address, c.speed, c.status, format(parseISO(c.expiryDate), "dd/MM/yyyy"), days, c.followUpPerson ?? "", c.remarks ?? ""];
      vals.forEach((v, ci) => {
        const cell = dataCell(ws, i + 6, ci + 1, v, bg);
        if (ci === 0) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (ci === 1) cell.font = { bold: true, name: "Calibri", size: 10 };
        if (ci === 7) { const color = days < 0 ? RED_HEX : days <= 3 ? RED_HEX : days <= 7 ? "E65100" : "2E7D32"; cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: "FF" + color } }; cell.alignment = { horizontal: "center", vertical: "middle" }; }
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `FTTH_ໃກ້ໝົດ_${fileDate}.xlsx`; a.click();
    setDone("expiring"); setTimeout(() => setDone(null), 4000);
    } catch (err) {
      setExportError("ດາວໂຫລດຜິດພາດ: " + (err?.message ?? "ກະລຸນາລອງໃໝ່"));
    } finally {
      setExporting(null);
    }
  }

  const expiringCount = customers.filter(c => differenceInDays(parseISO(c.expiryDate), now) <= 30).length;
  const activeCount   = customers.filter(c => c.status === "active").length;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,97%)]">

      <div className="px-6 pt-8 pb-6" style={{ background: "linear-gradient(135deg, hsl(0,66%,28%) 0%, hsl(0,66%,40%) 60%, hsl(0,52%,52%) 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-lg">
              <FileDown size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">ນຳອອກຂໍ້ມູນ Excel</h1>
              <p className="text-white/65 text-sm mt-0.5">ດາວໂຫຼດໄຟລ໌ Excel ພ້ອມຮູບແບບສີ · ສຳລັບວິເຄາະໃນ Microsoft Excel</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "ລູກຄ້າທັງໝົດ", value: customers.length, icon: Users, color: "bg-white/20" },
              { label: "ໃຊ້ງານ", value: activeCount, icon: Zap, color: "bg-emerald-500/25" },
              { label: "ໃກ້ໝົດ/ໝົດ", value: expiringCount, icon: Clock, color: "bg-amber-500/25" },
              { label: "ແພັກເກດ", value: packages.length, icon: Layers, color: "bg-blue-500/25" },
            ].map(stat => (
              <div key={stat.label} className={`${stat.color} backdrop-blur rounded-xl px-3 py-3 border border-white/20`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon size={11} className="text-white/70" />
                  <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-2xl font-extrabold text-white leading-none">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {exportError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700 flex-1">{exportError}</span>
            <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 bg-white rounded-2xl border-2 border-emerald-200 px-5 py-3 shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-sm font-bold text-emerald-700">ເຊື່ອມຕໍ່ຖານຂໍ້ມູນສຳເລັດ</span>
          <div className="ml-auto flex items-center gap-3 text-xs text-emerald-600 font-semibold">
            <span className="flex items-center gap-1.5"><Users size={12} /> {customers.length.toLocaleString()} ລູກຄ້າ</span>
            <span className="w-px h-4 bg-emerald-200" />
            <span className="flex items-center gap-1.5"><Layers size={12} /> {packages.length} ແພັກ</span>
            <span className="w-px h-4 bg-emerald-200" />
            <span className="flex items-center gap-1.5"><Clock size={12} /> {format(now, "HH:mm")}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-[hsl(0,66%,42%)]" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">ລາຍງານດ່ວນ</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                key: "full",
                icon: Table2,
                iconBg: "from-[hsl(0,66%,36%)] to-[hsl(0,66%,50%)]",
                title: "ລາຍງານລູກຄ້າທັງໝົດ",
                desc: "ຂໍ້ມູນລູກຄ້າທຸກຄົນ + ສະຖິຕິ + ແພັກເກດ (3 sheets)",
                badge: `${customers.length} ຄົນ`,
                badgeColor: "bg-red-100 text-[hsl(0,66%,42%)]",
                action: exportFull,
              },
              {
                key: "expiring",
                icon: AlertTriangle,
                iconBg: "from-amber-500 to-orange-500",
                title: "ລູກຄ້າໃກ້ໝົດ / ໝົດອາຍຸ",
                desc: "ລາຍຊື່ທີ່ໝົດ ຫຼື ຈະໝົດພາຍໃນ 30 ວັນ",
                badge: `${expiringCount} ຄົນ`,
                badgeColor: "bg-amber-100 text-amber-700",
                action: exportExpiring,
              },
            ].map(item => (
              <div key={item.key} className="group bg-white rounded-2xl border-2 border-[hsl(0,66%,90%)] shadow-sm hover:shadow-lg transition-all overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${item.iconBg}`} />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                    <button
                      onClick={item.action}
                      disabled={!!exporting}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, hsl(0,66%,36%), hsl(0,66%,50%))` }}
                    >
                      {exporting === item.key
                        ? <><Loader2 size={13} className="animate-spin" /> ກຳລັງສ້າງ...</>
                        : done === item.key
                        ? <><CheckCircle2 size={13} /> ສຳເລັດ!</>
                        : <><Download size={13} /> ດາວໂຫຼດ</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Custom export card */}
            <div className="group bg-white rounded-2xl border-2 border-[hsl(220,60%,85%)] shadow-sm hover:shadow-lg transition-all overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">ກອງຂໍ້ມູນ (Custom)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">ເລືອກສະຖານະ, ປະເພດ, ແພັກ, VIP</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilter(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold mb-3 hover:underline"
                >
                  <Filter size={11} />
                  {showFilter ? "ເຊື່ອງ Filter" : "ເປີດ Filter"}
                  {filterCount > 0 && <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{filterCount}</span>}
                  {showFilter ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {showFilter && (
                  <div className="space-y-3 mb-3 border border-blue-100 rounded-xl p-3 bg-blue-50/50">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">ສະຖານະ</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => toggle(selStatuses, o.value, setSelStatuses)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${selStatuses.includes(o.value) ? o.color + " shadow-sm" : "border-border text-muted-foreground hover:border-blue-300"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${o.dot}`} />
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">ປະເພດລູກຄ້າ</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TYPE_OPTIONS.map(o => (
                          <button key={o.value} onClick={() => toggle(selTypes, o.value, setSelTypes)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${selTypes.includes(o.value) ? "border-blue-500 bg-blue-100 text-blue-700" : "border-border text-muted-foreground hover:border-blue-300"}`}>
                            {o.icon} {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {packages.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">ແພັກເກດ</p>
                        <div className="flex flex-wrap gap-1.5">
                          {packages.map(p => (
                            <button key={p.id} onClick={() => toggle(selPackages, p.id, setSelPackages)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${selPackages.includes(p.id) ? "border-blue-500 bg-blue-100 text-blue-700" : "border-border text-muted-foreground hover:border-blue-300"}`}>
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setVipOnly(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all ${vipOnly ? "border-amber-400 bg-amber-50 text-amber-700" : "border-border text-muted-foreground hover:border-amber-300"}`}>
                        <Star size={11} className={vipOnly ? "text-amber-500 fill-amber-500" : ""} /> VIP ເທົ່ານັ້ນ
                      </button>
                      {filterCount > 0 && (
                        <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-red-500 hover:underline">
                          <X size={11} /> ລ້າງ
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {filtered.length} ຄົນ{hasFilter ? ` (ກອງ)` : ""}
                  </span>
                  <button
                    onClick={exportCustom}
                    disabled={!!exporting || filtered.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 bg-gradient-to-br from-blue-500 to-indigo-500"
                  >
                    {exporting === "custom"
                      ? <><Loader2 size={13} className="animate-spin" /> ກຳລັງສ້າງ...</>
                      : done === "custom"
                      ? <><CheckCircle2 size={13} /> ສຳເລັດ!</>
                      : <><Download size={13} /> ດາວໂຫຼດ</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
