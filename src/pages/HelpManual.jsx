import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  BookOpen, ShieldCheck, UserCircle, ChevronRight, ChevronDown,
  LogIn, LayoutDashboard, Users, Upload, Download,
  UsersRound, BarChart2, Ticket, Activity,
  Settings, AlertTriangle, Search, CheckCircle2,
  Star, FileSpreadsheet, Lock, Phone, Globe,
  Zap, Wifi, Wrench, RefreshCw, HelpCircle,
  Gift, Calendar, MapPin, Hash, MessageSquare,
  TrendingUp, PieChart, BarChart, CircleDot,
  ShieldAlert, Eye, Trash2, Edit2, Filter,
  Bell, Send, Server, Database, Info,
  PhoneCall, PhoneMissed, ThumbsDown, UserCheck,
  Package, ClipboardList, FileDown, Camera,
  ArrowRight, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helper Components ─────────────────────────────────────────────────────────
function Step({ n, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-[hsl(0,66%,42%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function InfoBox({ icon: Icon, color, title, children }) {
  const styles = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    red:   "bg-red-50 border-red-200 text-red-800",
    blue:  "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    gray:  "bg-muted/60 border-border text-foreground",
  };
  return (
    <div className={`border rounded-xl p-3.5 ${styles[color]}`}>
      <div className="flex items-center gap-2 font-semibold text-sm mb-1">
        <Icon size={14} /> {title}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function ManualTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold text-foreground first:rounded-tl-xl last:rounded-tr-xl whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-muted-foreground first:font-medium first:text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h4 className="font-semibold text-foreground text-[13px] uppercase tracking-wide border-l-2 border-[hsl(0,66%,42%)] pl-2 mt-1">
      {children}
    </h4>
  );
}

function ColorGuide({ items }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded flex-shrink-0 ${item.color}`} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function Callout({ children }) {
  return (
    <div className="bg-[hsl(0,66%,97%)] border border-[hsl(0,66%,85%)] rounded-xl px-4 py-3 text-sm text-[hsl(0,66%,35%)] font-medium">
      {children}
    </div>
  );
}

function BadgePill({ color, label, desc }) {
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {desc && <span className="text-xs text-muted-foreground">{desc}</span>}
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="space-y-2">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

// ─── ADMIN SECTIONS ────────────────────────────────────────────────────────────
const ADMIN_SECTIONS = [
  {
    id: "overview",
    icon: BookOpen,
    title: "ພາບລວມລະບົບ",
    content: () => (
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm leading-relaxed">
          <strong className="text-foreground">LTC FTTH Tracker</strong> ແມ່ນລະບົບຄຸ້ມຄອງລູກຄ້າ Fiber-to-the-Home (FTTH) ທີ່ອອກແບບສຳລັບທີມງານ LTC ໂດຍສະເພາະ — ຊ່ວຍຕິດຕາມສະຖານະ, ໝົດອາຍຸ, ການ Follow-up ແລະ ລາຍງານບັນຫາ ຄົບໃນທີ່ດຽວ.
        </p>

        <SubSection title="ໜ້າທີ່ຫຼັກຂອງລະບົບ">
          <ManualTable headers={["ໜ້າ", "ໄອຄອນ", "ສິດທິ"]} rows={[
            ["ໜ້າຫຼັກ (Dashboard)", "🏠", "Admin + Staff"],
            ["ລູກຄ້າທັງໝົດ", "👥", "Admin + Staff"],
            ["ເພີ່ມລູກຄ້າ", "➕", "Admin + Staff"],
            ["ຕິດຕາມ (Tracking)", "📡", "Admin + Staff"],
            ["ລາຍງານ (Reports)", "📊", "Admin + Staff"],
            ["ແຈ້ງບັນຫາ (Tickets)", "🎫", "Admin + Staff"],
            ["ສົ່ງອອກ (Export)", "📥", "Admin + Staff"],
            ["ນຳເຂົ້າ (Import)", "📤", "Admin ເທົ່ານັ້ນ"],
            ["ຈັດການພະນັກງານ", "🧑‍💼", "Admin ເທົ່ານັ້ນ"],
            ["ຄູ່ມືນີ້", "📖", "Admin + Staff"],
          ]} />
        </SubSection>

        <SubSection title="ໂຄງສ້າງ Role">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-[hsl(0,66%,80%)] bg-[hsl(0,66%,97%)] rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 font-bold text-[hsl(0,66%,38%)]">
                <ShieldCheck size={16} /> Admin
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-1 list-disc pl-4">
                <li>ເຂົ້າໄດ້ທຸກໜ້າ</li>
                <li>ນຳເຂົ້າຂໍ້ມູນ Excel</li>
                <li>ຈັດການ / ເພີ່ມ / ລຶບ Staff</li>
                <li>ລຶບລູກຄ້າ Batch / ທັງໝົດ</li>
                <li>ລຶບ Ticket ທັງໝົດ</li>
                <li>Login ດ້ວຍ OTP Telegram</li>
              </ul>
            </div>
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-700">
                <UserCircle size={16} /> Staff
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-1 list-disc pl-4">
                <li>ເຂົ້າໄດ້ທຸກໜ້າ ຍົກເວັ້ນ Import + Staff</li>
                <li>ເພີ່ມ / ແກ້ໄຂ / ລຶບ ລູກຄ້າ (ດຽວ)</li>
                <li>ສ້າງ / Update Ticket</li>
                <li>Export ຂໍ້ມູນ</li>
                <li>Login ດ້ວຍ Username + Password</li>
              </ul>
            </div>
          </div>
        </SubSection>
      </div>
    ),
  },
  {
    id: "login",
    icon: LogIn,
    title: "ການເຂົ້າສູ່ລະບົບ Admin",
    content: () => (
      <div className="space-y-5">
        <Callout>Admin ໃຊ້ OTP ຜ່ານ Telegram — ບໍ່ມີ Password ໃນ database ເພື່ອຄວາມປອດໄພ</Callout>

        <SubSection title="ຂັ້ນຕອນ Login">
          <div className="space-y-2">
            <Step n={1} text='ເປີດ LTC FTTH Tracker → ໜ້າ Login ຈະສະແດງ' />
            <Step n={2} text='ໃສ່ Username: "S14Y2" (ຕົວໃຫຍ່ ຫຼື ຕົວນ້ອຍກໍ່ໄດ້ — ລະບົບ convert ໃຫ້)' />
            <Step n={3} text='ກົດ "ຂໍ OTP ທາງ Telegram" → Telegram Bot ສົ່ງ OTP 6 ຕົວ ທັນທີ' />
            <Step n={4} text='ໃສ່ OTP ໃນຊ່ອງ → ກົດ "ເຂົ້າສູ່ລະບົບ"' />
          </div>
        </SubSection>

        <SubSection title="ກ່ຽວກັບ OTP">
          <ManualTable headers={["ຫົວຂໍ້", "ລາຍລະອຽດ"]} rows={[
            ["ອາຍຸ OTP", "5 ນາທີ — ໝົດແລ້ວ ໃຊ້ບໍ່ໄດ້"],
            ["ຮູບແບບ OTP", "ຕົວເລກ 6 ຕົວ"],
            ["ສົ່ງ OTP ໃໝ່", "ກົດ \"ສົ່ງ OTP ໃໝ່\" ຖ້າ OTP ໝົດ ຫຼື ບໍ່ໄດ້ຮັບ"],
            ["Bot Telegram", "ຕ້ອງ start Bot ກ່ອນ (ຄ້ນ @BotFather ຕັ້ງ)"],
          ]} />
        </SubSection>

        <SubSection title="ການ Logout">
          <p className="text-sm text-muted-foreground">ກົດຊື່ຜູ້ໃຊ້ ດ້ານຂວາເທິງ → ເລືອກ <strong>"ອອກຈາກລະບົບ"</strong> → Session ຈະຖືກລ້າງ</p>
        </SubSection>

        <InfoBox icon={AlertTriangle} color="amber" title="ໝາຍເຫດຄວາມປອດໄພ">
          ຫ້າມ share OTP ໃຫ້ຄົນອື່ນ — ຖ້າ Telegram account ຖືກ compromise ໃຫ້ປ່ຽນ Bot Token ທັນທີ
        </InfoBox>

        <InfoBox icon={Lock} color="blue" title="Environment Variables ທີ່ຕ້ອງຕັ້ງ">
          <div className="font-mono text-xs space-y-1 mt-1">
            <div>VITE_TELEGRAM_BOT_TOKEN = &lt;token ຈາກ @BotFather&gt;</div>
            <div>VITE_TELEGRAM_ADMIN_CHAT_ID = &lt;chat ID ຂອງ Admin&gt;</div>
            <div>VITE_SUPABASE_URL = &lt;Supabase project URL&gt;</div>
            <div>VITE_SUPABASE_ANON_KEY = &lt;Supabase anon key&gt;</div>
          </div>
        </InfoBox>
      </div>
    ),
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "ໜ້າຫຼັກ Dashboard",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Dashboard ເປັນຈຸດສູນກາງສະຫຼຸບທຸກຢ່າງ — ເປີດຂຶ້ນທຳອິດຫຼັງ Login ທຸກຄັ້ງ</p>

        <SubSection title="4 ບັດສະຫຼຸບດ້ານເທິງ">
          <ManualTable headers={["ບັດ", "ຄວາມໝາຍ", "ຄລິກໄປ"]} rows={[
            ["🟢 ລູກຄ້າປົກກະຕິ", "Active ທີ່ໝົດ > 7 ວັນ — ສຸຂະພາບດີ", "ໜ້າ ລູກຄ້າ"],
            ["🟡 ໃກ້ໝົດອາຍຸ", "Active ທີ່ໝົດ ≤ 7 ວັນ — ຄວນ Follow-up", "ໜ້າ Tracking"],
            ["🔴 ໝົດອາຍຸແລ້ວ", "ໝົດໄປແລ້ວ — ແບ່ງ 3 ໄລຍະ (≤6 / 6-12 / 12+)", "ໜ້າ Tracking"],
            ["🔵 ທັງໝົດ", "ລູກຄ້າທັງໝົດໃນລະບົບ + ຈຳນວນ Package", "ໜ້າ ລູກຄ້າ"],
          ]} />
          <p className="text-xs text-muted-foreground">ທຸກບັດ: ກົດດາວໂຫລດ Excel ໄດ້ທັນທີ ໂດຍກົດໄອຄອນ Excel ຢູ່ໃນບັດ</p>
        </SubSection>

        <SubSection title="ໄລຍະໝົດອາຍຸ (ໃນບັດ ໝົດອາຍຸ)">
          <ManualTable headers={["ໄລຍະ", "ສີ", "ຄວາມໝາຍ"]} rows={[
            ["≤ 6 ເດືອນ", "🟡 ສີເຫຼືອງ", "ໝົດໄປ ≤ 6 ເດືອນ — ໂອກາດ recover ສູງ"],
            ["6-12 ເດືອນ", "🟠 ສີສົ້ມ", "ໝົດ 6-12 ເດືອນ — ຕ້ອງ effort"],
            ["12+ ເດືອນ", "🔴 ສີແດງ", "ໝົດ > 1 ປີ — ຕ້ອງ assess"],
          ]} />
        </SubSection>

        <SubSection title="VIP + ສັດສ່ວນປະເພດລູກຄ້າ">
          <p className="text-sm text-muted-foreground">ແຖວທີ 2 ສະແດງ: <strong>ລູກຄ້າ VIP</strong> (ຈຳນວນ + %) ແລະ <strong>ຕາຕະລາງ Bar</strong> ສັດສ່ວນ IN / CC / CE ທຸກປະເພດ ພ້ອມ Progress bar ແຕ່ລະໝວດ</p>
        </SubSection>

        <SubSection title="ກາຟ ຄວາມໄວທີ່ນິຍົມ">
          <p className="text-sm text-muted-foreground">ສະແດງ % ລູກຄ້າຕາມ Speed (35Mbps / 55Mbps / 100Mbps …) — ກົດ bar ໃດ → ໄປໜ້າ ລູກຄ້າ filter ດ້ວຍ Speed ນັ້ນທັນທີ</p>
        </SubSection>

        <SubSection title="ສຸຂະພາບລະບົບ (System Health)">
          <ManualTable headers={["ຕົວຊີ້ວັດ", "ລາຍລະອຽດ"]} rows={[
            ["ລູກຄ້າໃຊ້ງານ %", "Active ÷ ທັງໝົດ"],
            ["Uptime %", "98.7% (Static — ອ້າງອີງ SLA)"],
            ["ການຕອບສະໜອງ %", "95% (Static — ອ້າງອີງ SLA)"],
          ]} />
        </SubSection>

        <SubSection title="ຄວາມຄືບໜ້າ Follow-up">
          <p className="text-sm text-muted-foreground">Progress bar ສະແດງ <strong>ຈຳນວນ Done+Completed ÷ ທັງໝົດ</strong> ທີ່ຕ້ອງ Follow-up ພ້ອມ breakdown 4 ສະຖານະ</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { dot: "bg-red-500", label: "ຕ້ອງຕິດຕາມ", desc: "ຍັງບໍ່ call" },
              { dot: "bg-amber-400", label: "ກຳລັງຕິດຕາມ", desc: "Call ໄດ້ — negotiate" },
              { dot: "bg-blue-400", label: "ຕິດຕາມແລ້ວ", desc: "ລໍຜົນ" },
              { dot: "bg-emerald-500", label: "ສຳເລັດ", desc: "Confirm / Renewed" },
            ].map(p => <BadgePill key={p.label} {...p} />)}
          </div>
        </SubSection>

        <SubSection title="ຕາຕະລາງ ໃກ້ໝົດ / ໝົດ (ດ້ານລ່າງ)">
          <p className="text-sm text-muted-foreground">ສະແດງລູກຄ້າທີ່ <strong>ໝົດ 7 ວັນທີ່ຜ່ານມາ ຫາ 30 ວັນຂ້າງໜ້າ</strong> — Pagination 20 ແຖວ / ໜ້າ</p>
          <ColorGuide items={[
            { color: "bg-red-400", label: "ໝົດໄປແລ້ວ" },
            { color: "bg-amber-400", label: "ໃກ້ໝົດ ≤ 3 ວັນ" },
            { color: "bg-gray-300", label: "ເຫຼືອ 4–30 ວັນ" },
          ]} />
        </SubSection>

        <SubSection title="ກາຟ ລູກຄ້າຕາມ Package (Donut)">
          <p className="text-sm text-muted-foreground">Donut Chart ສະແດງ % ລູກຄ້າຕາມ Package — ກົດ Legend → ໄປໜ້າ ລູກຄ້າ filter ດ້ວຍ Package ນັ້ນ</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "customers",
    icon: Users,
    title: "ຈັດການລູກຄ້າ",
    content: () => (
      <div className="space-y-5">

        <SubSection title="ການຄົ້ນຫາ">
          <p className="text-sm text-muted-foreground">ໃສ່ຂໍ້ຄວາມໃນຊ່ອງຄົ້ນຫາ — ຄົ້ນຫາໄດ້ຈາກ:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>ຊື່ລູກຄ້າ (ບາງສ່ວນກໍ່ໄດ້)</li>
            <li>ເບີໂທ</li>
            <li>ທີ່ຢູ່ / ບ້ານ / ເມືອງ</li>
            <li>ລະຫັດ Account (81fhXXXXXX)</li>
          </ul>
          <p className="text-xs text-muted-foreground">ຜົນການຄົ້ນຫາ refresh ທັນທີ ໂດຍບໍ່ຕ້ອງກົດ Enter</p>
        </SubSection>

        <SubSection title="ຕົວກອງ (Filter)">
          <ManualTable headers={["ຕົວກອງ", "ທາງເລືອກ"]} rows={[
            ["ສະຖານະ", "ໃຊ້ງານ / ບໍ່ໃຊ້ງານ / ຖືກລະງັບ / ໝົດອາຍຸ"],
            ["ປະເພດ", "IN / CC / CE / CG / CB / CI / CP / SP / IH / IO / CL"],
            ["ຄວາມໄວ", "ພິມ Mbps ເຊັ່ນ: 35Mbps, 100Mbps"],
            ["VIP", "ໝາຍ checkbox ສະແດງ VIP ເທົ່ານັ້ນ"],
          ]} />
          <p className="text-xs text-muted-foreground">ຕົວກອງຫຼາຍອັນໃຊ້ໄດ້ພ້ອມກັນ — ກົດ "ລ້າງຕົວກອງ" ເພື່ອ reset ທັງໝົດ</p>
        </SubSection>

        <SubSection title="ສີ Row ໃນຕາຕະລາງ">
          <ColorGuide items={[
            { color: "bg-white border", label: "Active ປົກກະຕິ (> 7 ວັນ)" },
            { color: "bg-amber-100", label: "Active ໃກ້ໝົດ (≤ 7 ວັນ)" },
            { color: "bg-red-100", label: "ໝົດອາຍຸ" },
            { color: "bg-gray-100", label: "Inactive / Suspended" },
          ]} />
        </SubSection>

        <SubSection title="ເບິ່ງ / ແກ້ໄຂ ລູກຄ້າ">
          <div className="space-y-2">
            <Step n={1} text="ກົດ row ໃດກໍ່ໄດ້ → panel ດ້ານຂວາ / modal ສະແດງຂໍ້ມູນທັງໝົດ" />
            <Step n={2} text='ກົດ ✏️ "ແກ້ໄຂ" → modal ແກ້ໄຂ ຈະ popup' />
            <Step n={3} text="ແກ້ໄຂຂໍ້ມູນ → ກົດ ບັນທຶກ" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">ຂໍ້ມູນທີ່ແກ້ໄຂໄດ້ໃນ modal: ສະຖານະ | ປະເພດ | Follow-up Status | ຜູ້ຕິດຕາມ | ໝາຍເຫດ | VIP</p>
        </SubSection>

        <SubSection title="ປະເພດລູກຄ້າ (Customer Type)">
          <ManualTable headers={["Code", "ໝວດ", "ໃຊ້ສຳລັບ"]} rows={[
            ["IN", "🏠 Individual", "ຜູ້ໃຊ້ທົ່ວໄປ / ຄົວເຮືອນ"],
            ["CC", "🏢 Corporate-Commercial", "ບໍລິສັດ / ຮ້ານຄ້າ"],
            ["CE", "🎓 Corporate-Education", "ໂຮງຮຽນ / ມະຫາວິທະຍາໄລ"],
            ["CG", "🏛️ Corporate-Government", "ກະຊວງ / ໂຮງໝໍ / ລັດ"],
            ["CB", "🏦 Corporate-Bank", "ທະນາຄານ / ສະຖາບັນການເງິນ"],
            ["CI", "🌐 Corporate-International", "ສະຖານທູດ / NGO / ອົງການ"],
            ["CP", "⚡ Corporate-Power/Industry", "ໄຟຟ້າ / ໂຮງງານ / ອຸດສາຫະກຳ"],
            ["SP", "🪪 Staff-LTC", "ພະນັກງານ ລດທ (ສ່ວນຫຼຸດ)"],
            ["IH", "🏠 In-House Internal", "ສາຂາ LTC ພາຍໃນ"],
            ["IO", "🏡 In-House Outside", "ຕ່ວນ LTC ນອກ"],
            ["CL", "🛰️ Corporate-Leased Line", "ສາຍລ້ານ / ສາຍລະຫວ່າງປະເທດ"],
          ]} />
        </SubSection>

        <SubSection title="ລຶບລູກຄ້າ (ດຽວ)">
          <div className="space-y-2">
            <Step n={1} text="ກົດ row → panel ສະແດງ → ກົດ 🗑️ ລຶບ" />
            <Step n={2} text="Dialog ຢືນຢັນ popup → ກົດ ລຶບ" />
          </div>
          <InfoBox icon={AlertTriangle} color="red" title="ຄຳເຕືອນ">
            ການລຶບ <strong>ບໍ່ສາມາດກູ້ຄືນໄດ້</strong> — ກວດສອບໃຫ້ດີ
          </InfoBox>
        </SubSection>

        <SubSection title="ລຶບ Batch (ເລືອກຫຼາຍ)">
          <div className="space-y-2">
            <Step n={1} text="ໝາຍ ✅ checkbox ທາງຊ້າຍຂອງ row ທີ່ຕ້ອງການ" />
            <Step n={2} text='ກົດ "ລຶບທີ່ເລືອກ" ໃນ bar ດ້ານເທິງ' />
            <Step n={3} text="ໃສ່ PIN ຢືນຢັນ Admin: 1144 → ກົດ ລຶບ" />
          </div>
          <InfoBox icon={Lock} color="blue" title="PIN ລຶບ Batch">
            ລະຫັດ PIN ສຳລັບ Bulk Delete: <strong className="font-mono">1144</strong> — ຮູ້ສະເພາະ Admin ເທົ່ານັ້ນ
          </InfoBox>
        </SubSection>

        <SubSection title="ລຶບລູກຄ້າທັງໝົດ (Admin Only)">
          <div className="space-y-2">
            <Step n={1} text='ກົດ "ລຶບທັງໝົດ" ສີແດງ ມຸມຂວາ' />
            <Step n={2} text="ໃສ່ PIN Admin: 1144 → ຢືນຢັນ" />
          </div>
          <InfoBox icon={ShieldAlert} color="red" title="⚠️ ອັນຕະລາຍສູງ">
            ການກະທຳນີ້ <strong>ລຶບລູກຄ້າທັງໝົດ</strong> ໃນ database — ຢ່າໃຊ້ຖ້າບໍ່ແນ່ໃຈ. Export Excel backup ກ່ອນສະເໝີ.
          </InfoBox>
        </SubSection>
      </div>
    ),
  },
  {
    id: "add_customer",
    icon: Users,
    title: "ເພີ່ມ & ຕໍ່ Subscription ລູກຄ້າ",
    content: () => (
      <div className="space-y-5">

        <SubSection title="ເພີ່ມລູກຄ້າໃໝ່ — Step 1: ຂໍ້ມູນຫຼັກ">
          <ManualTable headers={["ຊ່ອງ", "ຕ້ອງ?", "ໝາຍເຫດ"]} rows={[
            ["ຊື່ລູກຄ້າ", "✅ ຕ້ອງ", "ຊື່ເຕັມ"],
            ["ເບີໂທ", "✅ ຕ້ອງ", "ໃຊ້ unique check"],
            ["ຄວາມໄວ (Mbps)", "✅ ຕ້ອງ", "ເລືອກຈາກ dropdown"],
            ["ວັນເລີ່ມ (dd/MM/yyyy)", "✅ ຕ້ອງ", "ວັນທີ່ເລີ່ມໃຊ້ service"],
            ["ໄລຍະ (ເດືອນ)", "✅ ຕ້ອງ", "1 / 3+1 / 6+2 / 12+4 ເດືອນ"],
            ["ລະຫັດ Account", "❌ ທາງເລືອກ", "ຖ້າວ່າງ → ສ້າງ 81fhXXXXXX ໂດຍອັດຕະໂນມັດ"],
            ["ທີ່ຢູ່ / ບ້ານ", "❌ ແນະນຳ", "ສຳລັບ field support"],
            ["ເມືອງ / ແຂວງ", "❌ ແນະນຳ", ""],
            ["ປະເພດລູກຄ້າ", "❌ default: IN", "IN / CC / CE …"],
            ["Username WiFi", "❌ ທາງເລືອກ", ""],
          ]} />
        </SubSection>

        <SubSection title="ໂປໂມຊັນ Bonus ເດືອນ">
          <ManualTable headers={["ຈ່າຍ", "ໄດ້ທັງໝົດ", "ແຖມ", "ໝາຍເຫດ"]} rows={[
            ["1 ເດືອນ", "1 ເດືອນ", "ບໍ່ມີ", "ປົກກະຕິ"],
            ["3 ເດືອນ", "4 ເດືອນ", "+1 ເດືອນ", "ແຖມ 1"],
            ["6 ເດືອນ", "8 ເດືອນ", "+2 ເດືອນ", "ແຖມ 2"],
            ["12 ເດືອນ", "16 ເດືອນ", "+4 ເດືອນ", "ແຖມ 4"],
          ]} />
          <p className="text-xs text-muted-foreground">ລະບົບ calculate ວັນໝົດ ໂດຍອັດຕະໂນມັດ ຈາກ ວັນເລີ່ມ + ໄລຍະ (ລວມ Bonus)</p>
        </SubSection>

        <SubSection title="ເພີ່ມລູກຄ້າໃໝ່ — Step 2: ຕິດຕາມ & ໝາຍເຫດ">
          <ManualTable headers={["ຊ່ອງ", "ທາງເລືອກ"]} rows={[
            ["ສະຖານະ Follow-up", "ຕ້ອງຕິດຕາມ / ກຳລັງ / ຕິດຕາມແລ້ວ / ສຳເລັດ"],
            ["ຊື່ຜູ້ຕິດຕາມ", "ຊື່ພະນັກງານ"],
            ["ໝາຍເຫດ", "ຂໍ້ຄວາມ free-text"],
            ["VIP", "ໝາຍ checkbox"],
          ]} />
        </SubSection>

        <SubSection title="ຕໍ່ Subscription (Renew)">
          <div className="space-y-2">
            <Step n={1} text="ຄົ້ນຫາລູກຄ້າ → ກົດ row → ກົດ ✏️ ແກ້ໄຂ" />
            <Step n={2} text="ປ່ຽນ ວັນໝົດ ໃຫ້ເປັນວັນໃໝ່ (ຄຳນວນຈາກ Package ທີ່ຕໍ່)" />
            <Step n={3} text="ປ່ຽນ Status ກັບ active (ຖ້າ expired)" />
            <Step n={4} text='ກົດ "ບັນທຶກ" → ໝົດອາຍຸໃໝ່ update ທັນທີ' />
          </div>
          <InfoBox icon={Info} color="blue" title="ຫຼືໃຊ້ Tracking ຕໍ່ຜ່ານ Renew Modal">
            ໜ້າ Tracking ມີ Renew Modal ທີ່ Calculate ວັນໝົດໃໝ່ + Bonus ໃຫ້ອັດຕະໂນມັດ — ແນະນຳໃຊ້ Tracking ສຳລັບ Renew
          </InfoBox>
        </SubSection>

        <SubSection title="ຄວາມໄວທີ່ຮອງຮັບ">
          <p className="text-sm text-muted-foreground">35 / 55 / 70 / 80 / 100 / 120 / 160 / 170 / 180 / 300 / 320 / 400 / 420 Mbps</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "tracking",
    icon: Activity,
    title: "ການຕິດຕາມ (Tracking)",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ໜ້ານີ້ອອກແບບສຳລັບ <strong>ພະນັກງານໂທຕິດຕາມ</strong> ລູກຄ້າໃກ້ໝົດ / ໝົດ — Update ຜົນການໂທ ແລະ Renew ໄດ້ທັນທີ</p>

        <SubSection title="5 Tab ໄລຍະ">
          <ManualTable headers={["Tab", "ສີ", "ໝາຍເຫດ"]} rows={[
            ["ໃກ້ໝົດ (≤7ວ)", "🟡 ເຫຼືອງ", "Active ທີ່ໝົດ ≤ 7 ວັນ — ດ່ວນທີ່ສຸດ"],
            ["ໝົດ ≤6 ເດືອນ", "🟠 ສົ້ມ", "ໝົດ 1-180 ວັນ"],
            ["ໝົດ 6-12 ເດືອນ", "🔴 ແດງ", "ໝົດ 181-365 ວັນ"],
            ["ໝົດ 12+ ເດືອນ", "🟤 ແດງເຂັ້ມ", "ໝົດ > 1 ປີ"],
            ["ທັງໝົດ", "⚪ ທົ່ວໄປ", "ລວມທຸກ category ຂ້າງເທິງ"],
          ]} />
        </SubSection>

        <SubSection title="ຂັ້ນຕອນ Follow-up ລູກຄ້າ">
          <div className="space-y-2">
            <Step n={1} text="ເລືອກ Tab ໄລຍະ → ເບິ່ງລາຍຊື່ລູກຄ້າ" />
            <Step n={2} text="ກົດ row ລູກຄ້າ → panel ດ້ານຂວາ / ດ້ານລ່າງ ສະແດງ" />
            <Step n={3} text="ໂທຫາລູກຄ້າ → ເລືອກ ຜົນການໂທ" />
            <Step n={4} text="Update Follow-up Status + ຊື່ຜູ້ຕິດຕາມ → ກົດ ບັນທຶກ" />
            <Step n={5} text='ຖ້າລູກຄ້າ confirm ຕໍ່ → ກົດ "🔄 ຕໍ່ Subscription" → ເລືອກ Package' />
          </div>
        </SubSection>

        <SubSection title="ຜົນການໂທ (Call Result)">
          <ManualTable headers={["ຜົນ", "ສີ", "ໃຊ້ເມື່ອ"]} rows={[
            ["ຈະຕໍ່ສັນຍາ", "🟢 ຂຽວ", "ລູກຄ້າ confirm ຕໍ່"],
            ["ກຳລັງພິຈາລະນາ", "🟡 ເຫຼືອງ", "ຍັງຕັດສິນໃຈບໍ່ໄດ້"],
            ["ຈະໂທກັບ", "🔵 ຟ້າ", "ນັດ call ກັບ"],
            ["ບໍ່ຮັບສາຍ", "⚪ ເທົາ", "ໂທບໍ່ຕິດ"],
            ["ບໍ່ສົນໃຈ", "🔴 ແດງ", "ລູກຄ້າ cancel / ບໍ່ຕ້ອງການ"],
          ]} />
        </SubSection>

        <SubSection title="Follow-up Status (4 ຂັ້ນ)">
          <div className="grid grid-cols-2 gap-2">
            {[
              { dot: "bg-red-500", label: "ຕ້ອງຕິດຕາມ", desc: "ຍັງບໍ່ call" },
              { dot: "bg-amber-400", label: "ກຳລັງຕິດຕາມ", desc: "Call ໄດ້ — negotiate" },
              { dot: "bg-blue-400", label: "ຕິດຕາມແລ້ວ", desc: "Call ໄດ້ — ລໍຜົນ" },
              { dot: "bg-emerald-500", label: "ສຳເລັດ", desc: "Confirm / Renewed" },
            ].map(p => <BadgePill key={p.label} {...p} />)}
          </div>
        </SubSection>

        <SubSection title="Renew ຜ່ານ Tracking">
          <div className="space-y-2">
            <Step n={1} text='ກົດ "ຕໍ່ Subscription" ໃນ panel ລູກຄ້າ' />
            <Step n={2} text="ເລືອກ Package: 1 / 3+1 / 6+2 / 12+4 ເດືອນ" />
            <Step n={3} text="ລະບົບ Preview ວັນໝົດໃໝ່ + Bonus ໃຫ້ → ຢືນຢັນ" />
            <Step n={4} text="ສຳເລັດ → Status ກາຍເປັນ Active + Follow-up = ສຳເລັດ" />
          </div>
          <InfoBox icon={Gift} color="green" title="Bonus Logic">
            ຖ້ານຍັງ active → ຕໍ່ຈາກ ວັນໝົດເດີມ. ຖ້າ expired → ຕໍ່ຈາກ ວັນນີ້
          </InfoBox>
        </SubSection>

        <SubSection title="ຄົ້ນຫາ & ກັ່ນຕອງ ໃນ Tracking">
          <p className="text-sm text-muted-foreground">ຄົ້ນຫາ ຊື່ / ເບີໂທ + ກັ່ນຕອງ Follow-up Status + VIP ໄດ້ ໃນ Tracking</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "ticket",
    icon: Ticket,
    title: "ລະບົບ Ticket ບັນຫາ",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ລະບົບ Ticket ໃຊ້ຕິດຕາມບັນຫາ service ທຸກຢ່າງ — ຈາກ internet ຊ້າ ຈົນ ລູກຄ້າຂໍຕໍ່ອາຍຸ</p>

        <SubSection title="ໝວດໝູ່ Ticket (Category)">
          <ManualTable headers={["ໝວດ", "ໄອຄອນ", "ໃຊ້ເມື່ອ"]} rows={[
            ["ອິນເຕີເນັດຊ້າ", "⚡", "ຄວາມໄວຕ່ຳກວ່າ package"],
            ["ອິນເຕີເນັດຂາດ", "📶", "ໃຊ້ງານບໍ່ໄດ້ເລີຍ"],
            ["ອຸປະກອນຂັດຂ້ອງ", "🔧", "Router / ONT / Cable ມີບັນຫາ"],
            ["ຂໍຕໍ່ອາຍຸ", "🔄", "ລູກຄ້າ request ຕໍ່ subscription"],
            ["ອື່ນໆ", "❓", "ບໍ່ຢູ່ໃນ category ຂ້າງເທິງ"],
          ]} />
        </SubSection>

        <SubSection title="ສ້າງ Ticket ໃໝ່">
          <div className="space-y-2">
            <Step n={1} text='ໄປໜ້າ "ແຈ້ງບັນຫາ" → ກົດ "+ ສ້າງ Ticket"' />
            <Step n={2} text="ຄົ້ນຫາ / ເລືອກ ລູກຄ້າ (ຊອກຈາກ ຊື່ ຫຼື ເບີໂທ)" />
            <Step n={3} text="ເລືອກ ໝວດໝູ່ ແລະ Priority" />
            <Step n={4} text="ຕື່ມ ລາຍລະອຽດ + ວິທີຕິດຕໍ່ + ອັບໂຫລດຮູບ (ຖ້າມີ)" />
            <Step n={5} text='ກົດ "ສ້າງ Ticket" → ລະຫັດ TK-YYYYMMDD-XXXX ສ້າງໂດຍອັດຕະໂນມັດ' />
          </div>
        </SubSection>

        <SubSection title="Priority ຂອງ Ticket">
          <div className="grid grid-cols-2 gap-2">
            {[
              { dot: "bg-red-600", label: "Urgent (ດ່ວນ)", desc: "ດຳເນີນທັນທີ" },
              { dot: "bg-orange-500", label: "High (ສູງ)", desc: "ດ່ວນ" },
              { dot: "bg-blue-500", label: "Normal (ປົກກະຕິ)", desc: "ດຳເນີນຕາມລຳດັບ" },
              { dot: "bg-slate-400", label: "Low (ຕ່ຳ)", desc: "ບໍ່ດ່ວນ" },
            ].map(p => <BadgePill key={p.label} {...p} />)}
          </div>
        </SubSection>

        <SubSection title="ສະຖານະ Ticket (5 ຂັ້ນ)">
          <ManualTable headers={["ສະຖານະ", "ສີ", "ຄວາມໝາຍ"]} rows={[
            ["Queued (Open)", "🔵 ຟ້າ", "ຍື່ນໃໝ່ — ຍັງບໍ່ດຳເນີນ"],
            ["In Progress", "🟡 ເຫຼືອງ", "ກຳລັງດຳເນີນການ"],
            ["Pending", "🟣 ມ່ວງ", "ລໍຜົນ / ລໍ spare part"],
            ["Resolved", "🟢 ຂຽວ", "ແກ້ໄຂສຳເລັດ"],
            ["Closed", "⚪ ເທົາ", "ປິດ Ticket — ສຳເລັດທຸກ step"],
          ]} />
          <InfoBox icon={CheckCircle2} color="green" title="Best Practice">
            Resolve ຫຼັງຈາກແກ້ບັນຫາ → Closed ຫຼັງລູກຄ້າ confirm OK — Report ຈຶ່ງຖືກຕ້ອງ
          </InfoBox>
        </SubSection>

        <SubSection title="Update ສະຖານະ Ticket">
          <div className="space-y-2">
            <Step n={1} text="ຄົ້ນຫາ Ticket ຈາກ ລະຫັດ / ຊື່ / ວັນທີ" />
            <Step n={2} text='ກົດ "Update" ໃນ Ticket ນັ້ນ' />
            <Step n={3} text="ເລືອກ ສະຖານະໃໝ່ → ໃສ່ comment (ຖ້າຈຳເປັນ) → ບັນທຶກ" />
          </div>
        </SubSection>

        <SubSection title="ວິທີຕິດຕໍ່ (Contact Method)">
          <ManualTable headers={["ວິທີ", "ໃຊ້ເມື່ອ"]} rows={[
            ["ໂທລະສັບ", "ໂທຫາລູກຄ້າ"],
            ["WhatsApp", "ສົ່ງ WhatsApp"],
            ["ມາດ້ວຍຕົນເອງ", "ລູກຄ້າ walk-in"],
            ["ອື່ນໆ", "ວິທີອື່ນ"],
          ]} />
        </SubSection>

        <SubSection title="ການ Import Ticket ຈາກ Excel (Admin)">
          <div className="space-y-2">
            <Step n={1} text='ກົດ "ນຳເຂົ້າ Ticket" → ດາວໂຫລດ Template' />
            <Step n={2} text="ຕື່ມ Excel → upload → ກວດ Preview → Confirm" />
          </div>
        </SubSection>

        <SubSection title="ການລຶບ Ticket ທັງໝົດ (Admin)">
          <InfoBox icon={ShieldAlert} color="red" title="Admin Only">
            ກົດ "ລຶບ Ticket ທັງໝົດ" → ຕ້ອງໃສ່ PIN ຢືນຢັນ — ການກະທຳ<strong>ບໍ່ສາມາດຍ້ອນຄືນ</strong>
          </InfoBox>
        </SubSection>

        <SubSection title="Telegram Alert">
          <p className="text-sm text-muted-foreground">ທຸກ Ticket ໃໝ່ທີ່ສ້າງ (ທັງຈາກ system ແລະ Public Report) → Bot ສົ່ງ Alert ໄປ Telegram ທັນທີ ລວມ: ຊື່, ທີ່ຢູ່, ເບີໂທ, ໝວດ, ລາຍລະອຽດ</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "reports",
    icon: BarChart2,
    title: "ລາຍງານ (Reports)",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ໜ້າ Reports ລວມ chart + ຕາຕະລາງ + export ໃນທີ່ດຽວ — ທຸກ report ດາວໂຫລດ Excel ໄດ້</p>

        <SubSection title="ລາຍງານ Dashboard KPI">
          <ManualTable headers={["ລາຍງານ", "ສິ່ງທີ່ເຫັນ"]} rows={[
            ["ສະຫຼຸບ KPI", "Active / ໃກ້ໝົດ / ໝົດ / VIP / Ticket open"],
            ["ສຸຂະພາບລະບົບ", "% Active, Uptime, Response Rate"],
            ["ຄວາມຄືບໜ້າ Follow-up", "4 ສະຖານະ + % complete"],
          ]} />
        </SubSection>

        <SubSection title="ລາຍງານລູກຄ້າ">
          <ManualTable headers={["ລາຍງານ", "ເນື້ອຫາ"]} rows={[
            ["ລູກຄ້າທັງໝົດ", "ລາຍຊື່ + Status ທຸກຄົນ"],
            ["ໃກ້ໝົດ / ໝົດ", "ລູກຄ້າ 30 ວັນ follow-up + ໝົດ"],
            ["ຕາມປະເພດ (Bar)", "IN/CC/CE/CG… ຈຳນວນ + %"],
            ["ຕາມ Package (Pie)", "ສ່ວນແບ່ງ % ຕາມ Package"],
            ["ຕາມຄວາມໄວ (Bar)", "35/55/100… Mbps ຈຳນວນ + %"],
            ["ລູກຄ້າ VIP", "ລາຍຊື່ VIP ທັງໝົດ"],
          ]} />
        </SubSection>

        <SubSection title="ລາຍງານ Ticket">
          <ManualTable headers={["ລາຍງານ", "ເນື້ອຫາ"]} rows={[
            ["ສະຫຼຸບ Ticket", "Open / In Progress / Pending / Resolved / Closed"],
            ["ຕາມ Priority", "Urgent / High / Normal / Low"],
            ["ຕາມໝວດໝູ່", "ອິນເຕີເນັດຊ້າ / ຂາດ / ອຸປະກອນ / ຕໍ່ອາຍຸ / ອື່ນໆ"],
            ["Trend ລາຍເດືອນ", "ຈຳນວນ Ticket ຕໍ່ເດືອນ (Bar Chart)"],
          ]} />
        </SubSection>

        <SubSection title="ວິທີ Export Report">
          <div className="space-y-2">
            <Step n={1} text="ໄປໜ້າ Reports → ເລືອກ section ທີ່ຕ້ອງການ" />
            <Step n={2} text='ກົດ "Export Excel" ທ້າຍ section → ດາວໂຫລດ .xlsx ທັນທີ' />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Excel ທີ່ export ມີ format ສີ Header ສີແດງ LTC + ຂໍ້ມູນ format ດີ</p>
        </SubSection>

        <SubSection title="Snapshot ຮູບ (Screenshot Report)">
          <p className="text-sm text-muted-foreground">ທຸກ chart ໃນ Reports ມີ ໄອຄອນ 📷 — ກົດເພື່ອ capture ຮູບ PNG ຂອງ chart ນັ້ນ</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "import",
    icon: Upload,
    title: "ນຳເຂົ້າຂໍ້ມູນ (Import) — Admin",
    content: () => (
      <div className="space-y-5">
        <InfoBox icon={Lock} color="red" title="Admin Only">
          ໜ້ານີ້ເຂົ້າໄດ້ສະເພາະ Admin ເທົ່ານັ້ນ
        </InfoBox>

        <SubSection title="ດາວໂຫລດ Template Excel">
          <div className="space-y-2">
            <Step n={1} text='ໄປໜ້າ Import → ກົດ "ດາວໂຫລດ Template Excel"' />
            <Step n={2} text="ເປີດ .xlsx → ຕື່ມຂໍ້ມູນຕາມ columns ດ້ານລຸ່ມ" />
          </div>
        </SubSection>

        <SubSection title="Columns ໃນ Template">
          <ManualTable headers={["Column", "ຄຳອະທິບາຍ", "ຕ້ອງ?", "ຟໍແມດ"]} rows={[
            ["Name", "ຊື່ລູກຄ້າ", "✅", "ຂໍ້ຄວາມ"],
            ["Phone", "ເບີໂທ", "✅", "ຕົວເລກ"],
            ["Speed", "ຄວາມໄວ Mbps", "✅", "ເຊັ່ນ: 35Mbps"],
            ["Months", "ຈຳນວນເດືອນ", "✅", "1 / 3 / 6 / 12"],
            ["Start Date", "ວັນເລີ່ມ", "✅", "dd/MM/yyyy"],
            ["Village", "ບ້ານ / ທີ່ຢູ່", "❌", "ຂໍ້ຄວາມ"],
            ["District", "ເມືອງ", "❌", "ຂໍ້ຄວາມ"],
            ["User", "Username WiFi", "❌", "ຂໍ້ຄວາມ"],
            ["Type", "ປະເພດ", "❌", "IN/CC/CE…"],
            ["Installation Date", "ວັນຕິດຕັ້ງ", "❌", "dd/MM/yyyy"],
            ["Remarks", "ໝາຍເຫດ", "❌", "ຂໍ້ຄວາມ"],
          ]} />
          <p className="text-xs text-muted-foreground">ຮອງຮັບ Column ຊື່ ພາສາລາວ ຄືກັນ: ຊື່ລູກຄ້າ / ເບີໂທ / ຄວາມໄວ / ວັນເລີ່ມ / ເດືອນ …</p>
        </SubSection>

        <SubSection title="ຂັ້ນຕອນ Import">
          <div className="space-y-2">
            <Step n={1} text='ກົດ "ເລືອກໄຟລ໌ Excel" → browse ໄຟລ໌ .xlsx' />
            <Step n={2} text="ລະບົບ parse ແລ້ວສະແດງ Preview — ✅ ຂຽວ = ຖືກ | ❌ ແດງ = Error" />
            <Step n={3} text="ຖ້າມີ Error → ກົດ ✏️ inline edit ແກ້ໄຂ Row ນັ້ນໄດ້ທັນທີ" />
            <Step n={4} text='ກວດ Preview ຄົບ → ກົດ "ນຳເຂົ້າ X ຄົນ" → Confirm' />
          </div>
        </SubSection>

        <SubSection title="ໂລຈິກ Import">
          <ManualTable headers={["ສະຖານະ", "ລາຍລະອຽດ"]} rows={[
            ["Phone ຊ້ຳ", "Skip ອັດຕະໂນມັດ — ບໍ່ duplicate"],
            ["ວັນທີ Excel Serial", "Convert ໂດຍອັດຕະໂນມັດ (ເຊັ່ນ 46143 → 01/01/2026)"],
            ["Months 3→4", "ລະບົບ convert bonus ໃຫ້ (3→4, 6→8, 12→16 ເດືອນ)"],
            ["Type ບໍ່ຖືກ", "Default ກັບ IN"],
          ]} />
        </SubSection>

        <InfoBox icon={AlertTriangle} color="amber" title="ໝາຍເຫດ">
          Import ໃຊ້ສຳລັບ batch upload ເທົ່ານັ້ນ — ຢ່ານຳເຂົ້າຂໍ້ມູນທີ່ຍັງບໍ່ verified ເພາະ ຂໍ້ມູນ Live ຈ່ອ update ທັນທີ
        </InfoBox>
      </div>
    ),
  },
  {
    id: "export",
    icon: Download,
    title: "ສົ່ງອອກຂໍ້ມູນ (Export)",
    content: () => (
      <div className="space-y-5">

        <SubSection title="Export ຈາກໜ້າ Export ຫຼັກ">
          <div className="space-y-2">
            <Step n={1} text="ໄປໜ້າ Export" />
            <Step n={2} text="ເລືອກ ປະເພດ Export (ລູກຄ້າ / VIP / ໃກ້ໝົດ / ໝົດ …)" />
            <Step n={3} text="ຕັ້ງ Filter ຖ້າຕ້ອງການ (ສະຖານະ / ປະເພດ / ຄວາມໄວ)" />
            <Step n={4} text="ໝາຍ Columns ທີ່ຢາກ export" />
            <Step n={5} text='ກົດ "ດາວໂຫລດ Excel" → ດາວໂຫລດ .xlsx ທັນທີ' />
          </div>
        </SubSection>

        <SubSection title="ຕົວເລືອກ Export">
          <ManualTable headers={["ປະເພດ", "ຂໍ້ມູນທີ່ໄດ້"]} rows={[
            ["ລູກຄ້າທັງໝົດ", "ລາຍຊື່ + ຂໍ້ມູນທຸກ field"],
            ["ລູກຄ້າ VIP", "ສະເພາະ VIP"],
            ["ໃກ້ໝົດ (≤30ວ)", "ລູກຄ້າ follow-up"],
            ["ໝົດອາຍຸ", "ຕາມໄລຍະ ≤6 / 6-12 / 12+"],
            ["ຕາມ Status", "Active / Inactive / Suspended / Expired"],
            ["ສະຫຼຸບ Dashboard", "KPI + System Stats"],
            ["Ticket", "ທຸກ Ticket + Status + Priority"],
          ]} />
        </SubSection>

        <SubSection title="Export ຈາກ Dashboard">
          <p className="text-sm text-muted-foreground">ທຸກ Card ແລະ Bar ທີ່ມີໄອຄອນ <strong>Excel</strong> ດ້ານຂວາ → ກົດດາວໂຫລດໄດ້ທັນທີ ໂດຍບໍ່ຕ້ອງໄປໜ້າ Export</p>
        </SubSection>

        <SubSection title="Export ຈາກ Reports">
          <p className="text-sm text-muted-foreground">ທຸກ Section ໃນ Reports ມີ <strong>"Export Excel"</strong> ຢູ່ທ້າຍ → ກົດ export ໄດ້ທັນທີ</p>
        </SubSection>

        <InfoBox icon={AlertTriangle} color="amber" title="ຄວາມປອດໄພ">
          ຂໍ້ມູນ Export ເປັນ real-time — ຮັກສາໄຟລ໌ excel ໃຫ້ດີ ຢ່າ share ໄຟລ໌ 
          ທີ່ມີ personal info ຂອງລູກຄ້າ
        </InfoBox>
      </div>
    ),
  },
  {
    id: "staff",
    icon: UsersRound,
    title: "ຈັດການພະນັກງານ — Admin",
    content: () => (
      <div className="space-y-5">
        <InfoBox icon={Lock} color="red" title="Admin Only">
          ໜ້ານີ້ Admin ເທົ່ານັ້ນທີ່ເຂົ້າໄດ້
        </InfoBox>

        <SubSection title="ເພີ່ມພະນັກງານໃໝ່">
          <div className="space-y-2">
            <Step n={1} text='ໄປໜ້າ "ຈັດການພະນັກງານ" → ກົດ "+ ເພີ່ມ"' />
            <Step n={2} text="ໃສ່: Username (unique) | ຊື່ສະແດງ | ເບີໂທ | Password | Role" />
            <Step n={3} text='ກົດ "ເພີ່ມ" → ບັນຊີ activate ທັນທີ' />
          </div>
        </SubSection>

        <SubSection title="ສິດທິ Role">
          <ManualTable headers={["Role", "ໜ້າທີ່ເຂົ້າໄດ້"]} rows={[
            ["admin", "ທຸກໜ້າ + Import + Staff Management + ລຶບ Batch"],
            ["staff", "ທຸກໜ້າ ຍົກເວັ້ນ Import ແລະ Staff Management"],
          ]} />
        </SubSection>

        <SubSection title="ແກ້ໄຂ / Reset Password">
          <div className="space-y-2">
            <Step n={1} text="ໃນລາຍຊື່ Staff → ກົດ ✏️ edit" />
            <Step n={2} text="ປ່ຽນ Password ໃໝ່ → ກົດ ບັນທຶກ" />
          </div>
          <p className="text-xs text-muted-foreground">Password Strength indicator ສະແດງ: ອ່ອນ / ພໍໃຊ້ / ດີ / ແຂງແກ່ນ</p>
        </SubSection>

        <SubSection title="ປ່ຽນ Role">
          <div className="space-y-2">
            <Step n={1} text="ກົດ badge Role ຢູ່ card ພະນັກງານ" />
            <Step n={2} text="Confirm dialog → Role ປ່ຽນທັນທີ" />
          </div>
        </SubSection>

        <SubSection title="ລຶບ Staff">
          <div className="space-y-2">
            <Step n={1} text="ກົດ 🗑️ ໃນ card ພະນັກງານ → Confirm" />
          </div>
          <InfoBox icon={AlertTriangle} color="amber" title="ໝາຍເຫດ">
            ຫ້າມລຶບ account ທີ່ກຳລັງ login ຢູ່ — ຈະ error. ຖ້າຕ້ອງລຶບ ໃຫ້ Logout ກ່ອນ.
          </InfoBox>
        </SubSection>
      </div>
    ),
  },
  {
    id: "public_report",
    icon: Globe,
    title: "ການລາຍງານຜ່ານ Link ສາທາລະນະ",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ໜ້າ <strong>/report</strong> ແມ່ນ form ທີ່ <strong>ບໍ່ຕ້ອງ Login</strong> — ໃຫ້ Technician ຫຼື Staff ໃນ field ລາຍງານບັນຫາໄດ້ຈາກ Link ໂດຍກົງ</p>

        <SubSection title="ຂັ້ນຕອນ Submit">
          <div className="space-y-2">
            <Step n={1} text="ເປີດ link /report ຈາກ browser ໂດຍບໍ່ Login" />
            <Step n={2} text="ຄົ້ນຫາລູກຄ້າ → ເລືອກ" />
            <Step n={3} text="ເລືອກ ໝວດໝູ່ + ວິທີຕິດຕໍ່ + ໃສ່ລາຍລະອຽດ" />
            <Step n={4} text='ກົດ "ສົ່ງ" → Ticket ສ້າງ + Telegram Alert ສົ່ງ Admin ທັນທີ' />
          </div>
        </SubSection>

        <SubSection title="Telegram Alert ທີ່ Admin ໄດ້ຮັບ">
          <div className="bg-muted rounded-xl px-4 py-3 font-mono text-xs space-y-0.5">
            <div>⚠️⚠️ ແຈ້ງຕິດຄັດ (ພະນັກງານ) ⚠️⚠️</div>
            <div>ຊື່ : [ຊື່ລູກຄ້າ]</div>
            <div>ທີ່ຢູ່ : [ທີ່ຢູ່]</div>
            <div>ເບີໂທຕິດຕໍ່ : [ເບີໂທ]</div>
            <div>ເບີຕິດຄັດ : [Account ID]</div>
            <div>ໝວດຫມູ່ : [category]</div>
            <div>ລາຍລະອຽດ : [ລາຍລະອຽດ]</div>
          </div>
        </SubSection>

        <InfoBox icon={Info} color="blue" title="ໃຊ້ສຳລັບ">
          QR Code ຢູ່ Field Office ຫຼື ສົ່ງ Link ໃຫ້ Technician ໃຊ້ Report ໄວ ໂດຍບໍ່ຕ້ອງ account
        </InfoBox>
      </div>
    ),
  },
  {
    id: "pwa",
    icon: Phone,
    title: "ການຕິດຕັ້ງ App (PWA)",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">LTC FTTH Tracker ຮອງຮັບ <strong>PWA (Progressive Web App)</strong> — ຕິດຕັ້ງໄດ້ຄືກັບ App ໃນ Mobile ຫຼື Desktop ໂດຍບໍ່ຜ່ານ Store</p>

        <SubSection title="ຕິດຕັ້ງໃນ Android (Chrome)">
          <div className="space-y-2">
            <Step n={1} text="ເປີດ URL ໃນ Chrome Mobile" />
            <Step n={2} text='Banner "ຕິດຕັ້ງ App" ຈະ popup ດ້ານລ່າງ → ກົດ "ຕິດຕັ້ງ"' />
            <Step n={3} text="ຖ້າ banner ບໍ່ຂຶ້ນ: ກົດ menu ⋮ → ເລືອກ Add to Home Screen" />
          </div>
        </SubSection>

        <SubSection title="ຕິດຕັ້ງໃນ iPhone (Safari)">
          <div className="space-y-2">
            <Step n={1} text="ເປີດ URL ໃນ Safari" />
            <Step n={2} text='ກົດ Share icon (□↑) → ເລືອກ "Add to Home Screen"' />
            <Step n={3} text='ຕັ້ງຊື່ → ກົດ "Add"' />
          </div>
        </SubSection>

        <SubSection title="ຕິດຕັ້ງໃນ Desktop (Chrome / Edge)">
          <div className="space-y-2">
            <Step n={1} text="ເປີດ URL ໃນ Chrome ຫຼື Edge" />
            <Step n={2} text="ເບິ່ງ address bar ຈ່ອ ✚ ຫຼື install icon → ກົດ" />
          </div>
        </SubSection>

        <InfoBox icon={CheckCircle2} color="green" title="ຂໍ້ດີຂອງ PWA">
          App icon ຢູ່ Home Screen — ເປີດໄວ, ໃຊ້ຄື native app, ບໍ່ຕ້ອງ download ຈາກ Store
        </InfoBox>
      </div>
    ),
  },
  {
    id: "settings",
    icon: Settings,
    title: "ຕັ້ງຄ່າ & ດູແລລະບົບ",
    content: () => (
      <div className="space-y-5">

        <SubSection title="Telegram Bot (OTP + Alerts)">
          <ManualTable headers={["Variable", "ລາຍລະອຽດ"]} rows={[
            ["VITE_TELEGRAM_BOT_TOKEN", "Token ຈາກ @BotFather"],
            ["VITE_TELEGRAM_ADMIN_CHAT_ID", "Chat ID ຂອງ Admin (ເລກ)"],
          ]} />
          <div className="space-y-2 mt-2">
            <Step n={1} text="ໄປ Telegram → ຄົ້ນ @BotFather → /newbot → ສ້າງ Bot → copy Token" />
            <Step n={2} text="ໄປ @userinfobot → /start → copy Chat ID" />
            <Step n={3} text="ຕັ້ງ Environment Variable ໃນ Replit Secrets" />
          </div>
        </SubSection>

        <SubSection title="Supabase Database">
          <ManualTable headers={["Variable", "ລາຍລະອຽດ"]} rows={[
            ["VITE_SUPABASE_URL", "URL ຂອງ Supabase project"],
            ["VITE_SUPABASE_ANON_KEY", "Anon public key"],
          ]} />
          <p className="text-xs text-muted-foreground mt-1">Supabase ມີ automatic backup ທຸກວັນ — ເບິ່ງ Supabase Dashboard → Database → Backups</p>
        </SubSection>

        <SubSection title="Manual Backup">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Export Excel ທຸກ week ຢ່າງໜ້ອຍ 1 ຄັ້ງ</li>
            <li>ເກັບ backup ໃນ cloud (Drive / OneDrive)</li>
            <li>Supabase Pro ມີ Point-in-time recovery</li>
          </ul>
        </SubSection>

        <SubSection title="Security Checklist ປະຈຳ">
          <ManualTable headers={["ໜ້າທີ່", "ຄວາມຖີ່"]} rows={[
            ["Review ລາຍຊື່ Staff — ລຶບ account ທີ່ build ແລ້ວ", "ທຸກ 3 ເດືອນ"],
            ["ລຶບ Ticket Closed > 6 ເດືອນ", "ທຸກ Quarter"],
            ["ປ່ຽນ Password Staff ເກົ່າ", "ທຸກ 6 ເດືອນ"],
            ["Export backup ຂໍ້ມູນ", "ທຸກ week"],
          ]} />
        </SubSection>
      </div>
    ),
  },
  {
    id: "faq_admin",
    icon: Search,
    title: "ຄຳຖາມທີ່ພົບເລື້ອຍ (Admin)",
    content: () => (
      <div className="space-y-3">
        {[
          { q: "ລຶບລູກຄ້າ batch ຕ້ອງໃຊ້ PIN ຫຍັງ?", a: "PIN: 1144 — ໃສ່ໃນ dialog Bulk Delete" },
          { q: "OTP ໝົດ ຫຼື ບໍ່ໄດ້ຮັບ ເຮັດຫຍັງ?", a: "ກົດ \"ສົ່ງ OTP ໃໝ່\" — ລໍ 10-30 ວິ ຖ້ານ network ຊ້າ. ກວດ Bot Token ໃນ Secrets." },
          { q: "ຕ້ອງການ Export ລູກຄ້າໃກ້ໝົດ ເຮັດຫຍັງ?", a: "Dashboard → card ໃກ້ໝົດ → ກົດ Excel  ຫຼື ໄປໜ້າ Export → ເລືອກ \"ໃກ້ໝົດ\"" },
          { q: "ລຶບ Staff ທີ່ Login ຢູ່ ບໍ່ໄດ້?", a: "ໃຊ້ Account ອື່ນ (Admin 2) ລຶບ ຫຼື ລໍໃຫ້ Staff logout ກ່ອນ" },
          { q: "Import Excel ວັນທີ່ຂຶ້ນເປັນຕົວເລກ (46143) ຜິດ?", a: "ລະບົບ auto-convert Excel serial → ວັນທີ — ບໍ່ຕ້ອງແກ້" },
          { q: "Ticket ລຶບທັງໝົດໄດ້?", a: "Admin ກົດ \"ລຶບ Ticket ທັງໝົດ\" ໃນໜ້າ Ticket — ໃສ່ PIN ຢືນຢັນ" },
          { q: "Dashboard ສະແດງຂໍ້ມູນ lag ຫຍັງ?", a: "Dashboard refresh real-time — ຖ້າ cache: Ctrl+Shift+R / Hard refresh" },
          { q: "App ຊ້າ / error ເຮັດຫຍັງ?", a: "Refresh browser → logout → login ໃໝ່ → ຖ້ຍັງ error ກວດ Supabase Dashboard" },
        ].map((faq, i) => (
          <div key={i} className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-1.5">
              <span className="text-[hsl(0,66%,42%)] font-bold text-sm flex-shrink-0">Q.</span>
              <span className="font-semibold text-sm">{faq.q}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold text-sm flex-shrink-0">A.</span>
              <span className="text-sm text-muted-foreground">{faq.a}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ─── STAFF SECTIONS ────────────────────────────────────────────────────────────
const STAFF_SECTIONS = [
  {
    id: "overview_staff",
    icon: BookOpen,
    title: "ພາບລວມ — ໜ້າທີ່ Staff",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Staff ເຂົ້າໄດ້ທຸກໜ້າ <strong>ຍົກເວັ້ນ Import</strong> ແລະ <strong>ຈັດການ Staff</strong>
        </p>

        <SubSection title="ໜ້າທີ່ Staff ໃຊ້ທຸກວັນ">
          <ManualTable headers={["ໜ້າ", "ໃຊ້ສຳລັບ"]} rows={[
            ["🏠 Dashboard", "ເບິ່ງ KPI + ລາຍຊື່ໃກ້ໝົດ"],
            ["📡 Tracking", "Follow-up + Renew ລູກຄ້າ"],
            ["👥 ລູກຄ້າ", "ຄົ້ນຫາ / ແກ້ໄຂ / ເພີ່ມ"],
            ["🎫 Ticket", "ສ້າງ / Update ບັນຫາ"],
            ["📥 Export", "ດາວໂຫລດ Excel"],
          ]} />
        </SubSection>
      </div>
    ),
  },
  {
    id: "login_staff",
    icon: LogIn,
    title: "ການເຂົ້າ / ອອກ ລະບົບ",
    content: () => (
      <div className="space-y-5">
        <SubSection title="ຂັ້ນຕອນ Login">
          <div className="space-y-2">
            <Step n={1} text="ເປີດ LTC FTTH Tracker → ໜ້າ Login" />
            <Step n={2} text="ໃສ່ Username ຂອງທ່ານ (ຂໍຈາກ Admin)" />
            <Step n={3} text="ໃສ່ Password" />
            <Step n={4} text='ກົດ "ເຂົ້າສູ່ລະບົບ"' />
          </div>
        </SubSection>

        <InfoBox icon={AlertTriangle} color="amber" title="ຖ້າ Login ບໍ່ໄດ້">
          1. ກວດ Caps Lock<br />
          2. ຕິດຕໍ່ Admin ໃຫ້ Reset Password<br />
          3. ກວດ URL ຖືກຕ້ອງ
        </InfoBox>

        <SubSection title="ການ Logout">
          <p className="text-sm text-muted-foreground">ກົດ ຊື່ / Avatar ດ້ານຂວາເທິງ → ເລືອກ <strong>"ອອກຈາກລະບົບ"</strong></p>
          <InfoBox icon={Lock} color="blue" title="ຄຳແນະນຳ">
            Logout ທຸກຄັ້ງຫຼັງໃຊ້ງານໃນ device ສາທາລະນະ / ຄອມ office ທີ່ share
          </InfoBox>
        </SubSection>
      </div>
    ),
  },
  {
    id: "dashboard_staff",
    icon: LayoutDashboard,
    title: "ໜ້າຫຼັກ Dashboard",
    content: () => (
      <div className="space-y-5">
        <SubSection title="ສ່ວນທີ່ຄວນດູທຸກວັນ">
          <div className="space-y-2">
            {[
              { icon: "🟢", label: "ລູກຄ້າປົກກະຕິ", desc: "Active healthy — ລຳດັບ routine" },
              { icon: "🟡", label: "ໃກ້ໝົດ", desc: "ຕ້ອງ call ທັນທີ — ຈຳນວນຫຼາຍ = ວຽກຕິດຕາມ" },
              { icon: "🔴", label: "ໝົດອາຍຸ", desc: "ຕ້ອງ follow-up ດ່ວນ — ລາຍຮັບທີ່ສູນ" },
            ].map(i => (
              <div key={i.label} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                <span className="text-base mt-0.5">{i.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{i.label}</div>
                  <div className="text-xs text-muted-foreground">{i.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection title="ຕາຕະລາງ ໃກ້ໝົດ / ໝົດ ດ້ານລ່າງ">
          <p className="text-sm text-muted-foreground">ລາຍຊື່ <strong>ໝົດ 7 ວັນທີ່ຜ່ານ ຫາ 30 ວັນຂ້າງໜ້າ</strong> — ຮຽງຕາມ ວັນໝົດ ascending</p>
          <ColorGuide items={[
            { color: "bg-red-400", label: "ໝົດໄປແລ້ວ" },
            { color: "bg-amber-400", label: "ໃກ້ໝົດ ≤ 3 ວັນ" },
            { color: "bg-gray-300", label: "ຍັງ 4-30 ວັນ" },
          ]} />
        </SubSection>

        <SubSection title="ກາຟ ຄວາມໄວ">
          <p className="text-sm text-muted-foreground">ກົດ bar ໃດ → ໄປໜ້າ ລູກຄ້າ filter ດ້ວຍ Speed ນັ້ນໂດຍອັດຕະໂນມັດ</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "customers_staff",
    icon: Users,
    title: "ລາຍຊື່ & ຈັດການ ລູກຄ້າ",
    content: () => (
      <div className="space-y-5">
        <SubSection title="ການຄົ້ນຫາ">
          <p className="text-sm text-muted-foreground">ໃສ່ ຊື່ / ເບີໂທ / ລະຫັດ Account / ທີ່ຢູ່ ໃນຊ່ອງຄົ້ນຫາ → ຜົນ update ທັນທີ</p>
        </SubSection>

        <SubSection title="ຕົວກອງ (Filter)">
          <ManualTable headers={["ຕົວກອງ", "ທາງເລືອກ"]} rows={[
            ["ສະຖານະ", "ໃຊ້ງານ / ບໍ່ໃຊ້ / ລະງັບ / ໝົດ"],
            ["ປະເພດ", "IN/CC/CE/CG/CB/CI/CP/SP/IH/IO/CL"],
            ["ຄວາມໄວ", "ພິມ: 35Mbps, 100Mbps …"],
            ["VIP", "ໝາຍ Checkbox"],
          ]} />
        </SubSection>

        <SubSection title="ສີ Row ໝາຍ">
          <ColorGuide items={[
            { color: "bg-white border", label: "Active (> 7 ວັນ)" },
            { color: "bg-amber-100", label: "Active ໃກ້ໝົດ (≤ 7 ວັນ)" },
            { color: "bg-red-100", label: "ໝົດອາຍຸ" },
            { color: "bg-gray-100", label: "Inactive / Suspended" },
          ]} />
        </SubSection>

        <SubSection title="ເບິ່ງ / ແກ້ໄຂ ລູກຄ້າ">
          <div className="space-y-2">
            <Step n={1} text="ກົດ row → panel ສະແດງຂໍ້ມູນລາຍລະອຽດ" />
            <Step n={2} text='ກົດ "✏️ ແກ້ໄຂ" → modal popup' />
            <Step n={3} text="ແກ້ໄຂ: Status | Type | Follow-up | ຜູ້ຕິດຕາມ | ໝາຍເຫດ | VIP" />
            <Step n={4} text="ກົດ ບັນທຶກ" />
          </div>
        </SubSection>

        <SubSection title="ຕໍ່ Subscription">
          <div className="space-y-2">
            <Step n={1} text="ຄົ້ນຫາລູກຄ້າ → ກົດ row → ແກ້ໄຂ" />
            <Step n={2} text="ປ່ຽນ ວັນໝົດ ໃຫ້ເປັນວັນໃໝ່" />
            <Step n={3} text="ປ່ຽນ Status → active (ຖ້າ expired)" />
            <Step n={4} text='ກົດ "ບັນທຶກ"' />
          </div>
          <InfoBox icon={Info} color="blue" title="ວິທີດີກວ່າ">
            ໃຊ້ <strong>ໜ້າ Tracking → Renew Modal</strong> ຈະ calculate + bonus ໃຫ້ automatic
          </InfoBox>
        </SubSection>

        <SubSection title="ເພີ່ມລູກຄ້າໃໝ່">
          <div className="space-y-2">
            <Step n={1} text='ກົດ "➕ ເພີ່ມລູກຄ້າ" ທາງຊ້າຍ / ເທິງ' />
            <Step n={2} text="ຕື່ມ: ຊື່ [ຕ້ອງ] · ເບີໂທ [ຕ້ອງ] · ຄວາມໄວ · ໄລຍະ · ວັນເລີ່ມ [ຕ້ອງ]" />
            <Step n={3} text="Step 2: ຕື່ມ Follow-up + ໝາຍເຫດ (ຖ້ານ)" />
            <Step n={4} text='ກົດ "ບັນທຶກ" → Account ID ສ້າງອັດຕະໂນມັດ' />
          </div>
        </SubSection>

        <SubSection title="ລຶບລູກຄ້າ (ດຽວ)">
          <div className="space-y-2">
            <Step n={1} text="ກົດ row → panel → ກົດ 🗑️ ລຶບ → Confirm" />
          </div>
          <InfoBox icon={AlertTriangle} color="red" title="ຄຳເຕືອນ">
            ການລຶບ <strong>ບໍ່ສາມາດກູ້ຄືນໄດ້</strong> — ກວດໃຫ້ດີ
          </InfoBox>
        </SubSection>
      </div>
    ),
  },
  {
    id: "tracking_staff",
    icon: Activity,
    title: "ການຕິດຕາມ (Tracking)",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ໜ້ານີ້ ສຳລັບ Follow-up ລູກຄ້າ ໃກ້ໝົດ / ໝົດ — ໃຊ້ທຸກວັນ</p>

        <SubSection title="5 Tab ໄລຍະ">
          <ManualTable headers={["Tab", "ໜ້າທີ່ໃຊ້"]} rows={[
            ["ໃກ້ໝົດ (≤7ວ)", "ດ່ວນທີ່ສຸດ — call ກ່ອນ"],
            ["ໝົດ ≤6 ເດືອນ", "ໂອກາດ recover ສູງ"],
            ["ໝົດ 6-12 ເດືອນ", "ລາຍຊື່ follow-up ທຸ່ງ"],
            ["ໝົດ 12+ ເດືອນ", "Long-term churn"],
            ["ທັງໝົດ", "ລວມທຸກ category"],
          ]} />
        </SubSection>

        <SubSection title="ວຽກ Follow-up ທຸກວັນ">
          <div className="space-y-2">
            <Step n={1} text='ເປີດ Tab "ໃກ້ໝົດ" — ດູລາຍຊື່' />
            <Step n={2} text="ໂທ / WhatsApp ຫາລູກຄ້າ" />
            <Step n={3} text="ກົດ row → ເລືອກ ຜົນການໂທ (ຈາກ 5 ທາງເລືອກ)" />
            <Step n={4} text="Update Follow-up Status + ໃສ່ຊື່ຜູ້ຕິດຕາມ → ບັນທຶກ" />
            <Step n={5} text="ຖ້າ confirm ຕໍ່ → ກົດ Renew → ເລືອກ Package → ຢືນຢັນ" />
          </div>
        </SubSection>

        <SubSection title="ຜົນການໂທ">
          <ManualTable headers={["ຜົນ", "ໃຊ້ເມື່ອ"]} rows={[
            ["✅ ຈະຕໍ່ສັນຍາ", "ຕໍ່ confirm"],
            ["❓ ກຳລັງພິຈາລະນາ", "ຍັງ consider"],
            ["📞 ຈະໂທກັບ", "ນັດ call ກັບ"],
            ["📵 ບໍ່ຮັບສາຍ", "ໂທບໍ່ຕິດ"],
            ["👎 ບໍ່ສົນໃຈ", "ບໍ່ຕໍ່"],
          ]} />
        </SubSection>

        <SubSection title="ໂປໂມ Bonus ໃນ Renew">
          <ManualTable headers={["ຈ່າຍ", "ໄດ້ທັງໝົດ"]} rows={[
            ["1 ເດືອນ", "1 ເດືອນ"],
            ["3 ເດືອນ", "4 ເດືອນ (+1 ແຖມ)"],
            ["6 ເດືອນ", "8 ເດືອນ (+2 ແຖມ)"],
            ["12 ເດືອນ", "16 ເດືອນ (+4 ແຖມ)"],
          ]} />
        </SubSection>
      </div>
    ),
  },
  {
    id: "ticket_staff",
    icon: Ticket,
    title: "ລາຍງານບັນຫາ (Ticket)",
    content: () => (
      <div className="space-y-5">

        <SubSection title="ສ້າງ Ticket ໃໝ່">
          <div className="space-y-2">
            <Step n={1} text='ໄປໜ້າ "ແຈ້ງບັນຫາ" → ກົດ "+ ສ້າງ Ticket"' />
            <Step n={2} text="ຄົ້ນຫາ / ເລືອກ ລູກຄ້າ" />
            <Step n={3} text="ເລືອກ ໝວດໝູ່ ແລະ Priority" />
            <Step n={4} text="ໃສ່ ລາຍລະອຽດ + ວິທີຕິດຕໍ່ + ຮູບ (ຖ້ານ)" />
            <Step n={5} text='ກົດ "ສ້າງ Ticket" → ລະຫັດ TK- ສ້າງທັນທີ' />
          </div>
        </SubSection>

        <SubSection title="ໝວດໝູ່ Ticket">
          <div className="grid grid-cols-1 gap-2">
            {[
              { icon: "⚡", label: "ອິນເຕີເນັດຊ້າ", desc: "Speed ຕ່ຳກວ່າ package" },
              { icon: "📶", label: "ອິນເຕີເນັດຂາດ", desc: "ໃຊ້ງານບໍ່ໄດ້" },
              { icon: "🔧", label: "ອຸປະກອນຂັດຂ້ອງ", desc: "Router/ONT/Cable" },
              { icon: "🔄", label: "ຂໍຕໍ່ອາຍຸ", desc: "ລູກຄ້າ request renew" },
              { icon: "❓", label: "ອື່ນໆ", desc: "ທົ່ວໄປ" },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
                <span className="text-lg">{c.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection title="Update ສະຖານະ Ticket">
          <div className="space-y-2">
            <Step n={1} text="ຄົ້ນຫາ Ticket → ກົດ Update" />
            <Step n={2} text="ເລືອກ ສະຖານະໃໝ່ (Queued → In Progress → Resolved → Closed)" />
            <Step n={3} text="ໃສ່ comment (ຖ້ານ) → ບັນທຶກ" />
          </div>
        </SubSection>

        <SubSection title="ຄົ້ນຫາ Ticket">
          <p className="text-sm text-muted-foreground">ຄົ້ນຫາຈາກ: ລະຫັດ TK- | ຊື່ລູກຄ້າ | ໝວດໝູ່ | Status | Priority | ວັນທີ</p>
        </SubSection>

        <InfoBox icon={CheckCircle2} color="green" title="ຂັ້ນຕອນ Best Practice">
          ສ້າງ Ticket → ດຳເນີນ (In Progress) → ແກ້ໄຂ (Resolved) → ລູກຄ້າ OK → ປິດ (Closed)
        </InfoBox>
      </div>
    ),
  },
  {
    id: "export_staff",
    icon: Download,
    title: "Export ຂໍ້ມູນ",
    content: () => (
      <div className="space-y-5">

        <SubSection title="Export ຈາກໜ້າ Export">
          <div className="space-y-2">
            <Step n={1} text="ໄປໜ້າ Export" />
            <Step n={2} text="ເລືອກ ປະເພດ Export + Filter (ຖ້ານ)" />
            <Step n={3} text="ໝາຍ Columns ທີ່ຕ້ອງການ" />
            <Step n={4} text='ກົດ "ດາວໂຫລດ Excel" → .xlsx ດາວໂຫລດທັນທີ' />
          </div>
        </SubSection>

        <SubSection title="Export ດ່ວນຈາກ Dashboard">
          <p className="text-sm text-muted-foreground">ທຸກ Card ໃນ Dashboard ທີ່ມີ <strong>ໄອຄອນ Excel</strong> → ກົດດາວໂຫລດໄດ້ທັນທີ</p>
        </SubSection>

        <InfoBox icon={AlertTriangle} color="amber" title="ໝາຍເຫດ">
          ຂໍ້ມູນ Export ເປັນ real-time — ຮັກສາ file ດີ ຢ່າ share ຂໍ້ມູນ personal ກັບຜູ້ທີ່ບໍ່ກ່ຽວຂ້ອງ
        </InfoBox>
      </div>
    ),
  },
  {
    id: "reports_staff",
    icon: BarChart2,
    title: "ລາຍງານ (Reports)",
    content: () => (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">ໜ້າ Reports ຊ່ວຍ <strong>ວິເຄາະ</strong> ຂໍ້ມູນລູກຄ້າ + Ticket ດ້ວຍ chart + ຕາຕະລາງ</p>

        <SubSection title="ລາຍງານທີ່ Reports ມີ">
          <ManualTable headers={["ລາຍງານ", "ເໝາະສຳລັບ"]} rows={[
            ["KPI ສະຫຼຸບ", "Overview ລະດັບ management"],
            ["ລູກຄ້າ ຕາມປະເພດ", "ເບິ່ງ IN/CC/CE…"],
            ["ລູກຄ້າ ຕາມ Package", "Package ທີ່ popular"],
            ["ລູກຄ້າ ຕາມຄວາມໄວ", "Speed ທີ່ popular"],
            ["ໃກ້ໝົດ / ໝົດ", "ລາຍຊື່ follow-up"],
            ["VIP", "ລູກຄ້າ VIP"],
            ["Ticket Summary", "Status / Priority / Category"],
            ["Ticket Trend", "ຈຳນວນ Ticket ຕໍ່ເດືອນ"],
          ]} />
        </SubSection>

        <SubSection title="Export Report">
          <p className="text-sm text-muted-foreground">ກົດ <strong>"Export Excel"</strong> ທ້າຍ report ແຕ່ລະ section → ດາວໂຫລດ .xlsx</p>
        </SubSection>
      </div>
    ),
  },
  {
    id: "faq_staff",
    icon: Search,
    title: "ຄຳຖາມທີ່ພົບເລື້ອຍ",
    content: () => (
      <div className="space-y-3">
        {[
          { q: "ລຶບ Password ລືມ ເຮັດຫຍັງ?", a: "ຕິດຕໍ່ Admin ໃຫ້ Reset Password ໃຫ້" },
          { q: "ຕໍ່ Subscription ລູກຄ້າ ຖືກທີ່ສຸດ ເຮັດຫຍັງ?", a: "ໄປໜ້າ Tracking → ຄົ້ນຫາລູກຄ້າ → Renew Modal → ເລືອກ Package" },
          { q: "Export ລາຍຊື່ VIP ໄດ້ຈາກໃສ?", a: "Export ໜ້າ → ເລືອກ VIP, ຫຼື Reports → VIP" },
          { q: "Ticket resolve ແລ້ວ ຕ້ອງ Close ດ້ວຍ?", a: "ແນະນຳ Close ທຸກ Ticket — ເຮັດໃຫ້ Report ຖືກຕ້ອງ" },
          { q: "ສ້າງ Ticket ໂດຍບໍ່ Login ໄດ້ຫຼືບໍ?", a: "ໄດ້ — ໃຊ້ link /report (Public Report) ສຳລັບ field staff" },
          { q: "ຄົ້ນຫາ Account ID ທີ່ລືມ ເຮັດຫຍັງ?", a: "ໄປໜ້າ ລູກຄ້າ → ໃສ່ ຊື່ ຫຼື ເບີໂທ → ຫາ Account ID ໃນ row" },
          { q: "App ຄ້າງ / ໂຫລດຊ້າ ເຮັດຫຍັງ?", a: "Refresh (F5) → ລອງ Logout/Login ໃໝ່ → ຖ້ຍັງ: ແຈ້ງ Admin" },
          { q: "Ticket ຖືກ Admin ລຶບ ຫາ History ຈາກໃສ?", a: "ຫາ History ຈາກ Export Excel ທີ່ Export ໄວ້ກ່ອນ — Ticket ທີ່ລຶບ recover ໄດ້ຕ້ອງ Supabase backup" },
        ].map((faq, i) => (
          <div key={i} className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-1.5">
              <span className="text-[hsl(0,66%,42%)] font-bold text-sm flex-shrink-0">Q.</span>
              <span className="font-semibold text-sm">{faq.q}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold text-sm flex-shrink-0">A.</span>
              <span className="text-sm text-muted-foreground">{faq.a}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HelpManual() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState(isAdmin ? "admin" : "staff");
  const sections = tab === "admin" ? ADMIN_SECTIONS : STAFF_SECTIONS;
  const [activeId, setActiveId] = useState(sections[0].id);
  const active = sections.find(s => s.id === activeId) ?? sections[0];

  const handleTabChange = (t) => {
    setTab(t);
    const next = t === "admin" ? ADMIN_SECTIONS : STAFF_SECTIONS;
    setActiveId(next[0].id);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border bg-background">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[hsl(0,66%,42%)] flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">ຄູ່ມືການໃຊ້ງານ</h1>
            <p className="text-xs text-muted-foreground">LTC FTTH Tracker — ສະບັບລາຍລະອຽດ</p>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
            {[
              { id: "admin", label: "Admin", icon: ShieldCheck },
              { id: "staff", label: "ພະນັກງານ", icon: UserCircle },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  tab === t.id
                    ? "bg-[hsl(0,66%,42%)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle size={14} />
            <span>ຄູ່ມືພະນັກງານ</span>
          </div>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex w-60 flex-shrink-0 border-r border-border flex-col overflow-y-auto bg-muted/20 py-3">
          {sections.map(s => {
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[hsl(0,66%,42%)] text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <s.icon size={15} className="flex-shrink-0" />
                <span className="leading-tight">{s.title}</span>
                {isActive && <ChevronRight size={13} className="ml-auto flex-shrink-0 opacity-70" />}
              </button>
            );
          })}
        </div>

        {/* Mobile dropdown */}
        <div className="md:hidden w-full flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-muted/20">
            <select
              value={activeId}
              onChange={e => setActiveId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-[hsl(0,66%,42%)]"
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <active.icon size={18} className="text-[hsl(0,66%,42%)]" />
              {active.title}
            </h2>
            <active.content />
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden md:block flex-1 overflow-y-auto px-6 py-5">
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2.5 pb-3 border-b border-border">
            <active.icon size={20} className="text-[hsl(0,66%,42%)]" />
            {active.title}
          </h2>
          <active.content />
        </div>
      </div>
    </div>
  );
}
