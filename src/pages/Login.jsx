import { useState, useRef, useEffect } from "react";
import { useAuth, ADMIN_USERNAME } from "@/auth/AuthContext";
import { Eye, EyeOff, Lock, User, ShieldCheck, KeyRound, Send } from "lucide-react";

/* ────────────────────────────────────────────────
   Stable input – no inline style mutations on focus
   Uses CSS transitions via Tailwind focus classes
──────────────────────────────────────────────── */
function GlassInput({ icon: Icon, rightSlot, ...props }) {
  return (
    <div className="relative">
      <Icon
        size={15}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10"
      />
      <input
        {...props}
        className={[
          "w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium",
          "text-white placeholder:text-white/30",
          "bg-white/[0.08] border border-white/15",
          "focus:bg-white/[0.13] focus:border-white/45",
          "outline-none transition-[background-color,border-color] duration-150",
          "caret-white",
          props.className ?? "",
        ].join(" ")}
      />
      {rightSlot && (
        <div className="absolute right-0 top-0 h-full flex items-center pr-3.5">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Login form (pure display — no local state)
──────────────────────────────────────────────── */
function LoginForm({
  username, onUsernameChange,
  isAdmin, mode,
  password, onPasswordChange,
  showPwd, onTogglePwd,
  otp, onOtpChange,
  otpSent, otpLoading,
  onRequestOTP, onSubmit,
  canSubmit, loading,
  error,
}) {
  return (
    <div className="space-y-5">

      {/* Username */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-white/50">
          ຊື່ຜູ້ໃຊ້
        </label>
        <GlassInput
          icon={User}
          type="text"
          autoComplete="username"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={e => onUsernameChange(e.target.value)}
          placeholder="ພິມຊື່ຜູ້ໃຊ້..."
          rightSlot={mode !== "idle" ? (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              isAdmin
                ? "bg-red-500/20 text-red-300 border-red-400/30"
                : "bg-blue-500/20 text-blue-300 border-blue-400/30"
            }`}>
              {isAdmin
                ? <><ShieldCheck size={9} />Admin</>
                : <><User size={9} />Staff</>}
            </span>
          ) : null}
        />
      </div>

      {/* Admin OTP flow */}
      {mode !== "idle" && isAdmin && (
        <>
          <button
            type="button"
            onClick={onRequestOTP}
            disabled={otpLoading}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors duration-150 touch-manipulation
              text-white border border-white/20 bg-white/10 active:bg-white/25 disabled:opacity-50"
          >
            {otpLoading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ກຳລັງສົ່ງ OTP...</>
              : <><Send size={14} /> {otpSent ? "ສົ່ງ OTP ໃໝ່" : "ຂໍ OTP ທາງ Telegram"}</>}
          </button>

          {otpSent && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-white/50">
                ລະຫັດ OTP (6 ຕົວເລກ)
              </label>
              <GlassInput
                icon={KeyRound}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => onOtpChange(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && canSubmit && onSubmit()}
                placeholder="000000"
                className="tracking-[0.3em]"
                autoFocus
              />
              <p className="mt-2 text-xs text-white/40">
                OTP ຖືກສົ່ງໄປທີ່ Telegram ຂອງທ່ານແລ້ວ ⏱ ໃຊ້ໄດ້ 5 ນາທີ
              </p>
            </div>
          )}
        </>
      )}

      {/* Staff password flow */}
      {mode !== "idle" && !isAdmin && (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-white/50 flex items-center gap-1.5">
            <Lock size={10} /> ລະຫັດຜ່ານ
          </label>
          <GlassInput
            icon={Lock}
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canSubmit && onSubmit()}
            placeholder="••••••••"
            className="pr-11"
            rightSlot={
              <button
                type="button"
                onClick={onTogglePwd}
                className="text-white/40 hover:text-white/70 active:text-white/90 transition-colors touch-manipulation p-1"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-[#fca5a5] border"
          style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)" }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Submit */}
      {mode !== "idle" && (isAdmin ? otpSent : true) && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-wide text-white
            flex items-center justify-center gap-2
            transition-all duration-200 touch-manipulation
            disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: canSubmit && !loading
              ? "linear-gradient(135deg, hsl(0,66%,42%) 0%, hsl(0,66%,35%) 100%)"
              : "rgba(255,255,255,0.1)",
            boxShadow: canSubmit && !loading
              ? "0 8px 32px rgba(197,48,48,0.5), 0 2px 8px rgba(0,0,0,0.3)"
              : "none",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ກຳລັງເຂົ້າສູ່ລະບົບ...</>
            : <><ShieldCheck size={15} /> ເຂົ້າສູ່ລະບົບ</>}
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Main Login page
   • Uses 100svh (small viewport) so layout stays
     put when the mobile keyboard opens
   • Scrollable so content is never clipped
──────────────────────────────────────────────── */
export default function Login() {
  const { login, verifyStaff, requestAdminOTP, verifyAdminOTP } = useAuth();

  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("idle");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const isAdmin = username.trim().toLowerCase() === ADMIN_USERNAME;

  const handleUsernameChange = (val) => {
    const upper = val.replace(/^@+/, "").toUpperCase();
    setUsername(upper);
    setMode(upper.trim().length > 0 ? "password" : "idle");
    setError("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
  };

  const doShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleRequestOTP = async () => {
    setOtpLoading(true);
    setError("");
    const sent = await requestAdminOTP();
    setOtpLoading(false);
    if (sent) {
      setOtpSent(true);
      setOtp("");
    } else {
      setError("ສົ່ງ OTP ບໍ່ສຳເລັດ ກະລຸນາກວດສອບ Bot Telegram");
      doShake();
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (isAdmin) {
      if (!otpSent) { setError("ກະລຸນາຂໍ OTP ກ່ອນ"); doShake(); return; }
      if (!otp || otp.length < 6) { setError("ກະລຸນາໃສ່ OTP 6 ຕົວເລກ"); doShake(); return; }
      const ok = verifyAdminOTP(otp);
      if (ok) {
        login(ADMIN_USERNAME, "admin", "ຜູ້ດູແລລະບົບ", "");
      } else {
        setError("OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ");
        doShake();
        setOtp("");
      }
      return;
    }
    if (!password) { setError("ກະລຸນາໃສ່ລະຫັດຜ່ານ"); doShake(); return; }
    setLoading(true);
    const found = await verifyStaff(username.trim().toLowerCase(), password);
    setLoading(false);
    if (!found) {
      setError("ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ");
      doShake();
      setPassword("");
    } else {
      login(found.username, found.role, found.displayName, found.phone, found.permissions);
    }
  };

  const canSubmit = isAdmin
    ? otpSent && otp.length === 6
    : mode === "password" && password.length > 0;

  return (
    /*
      min-h-[100svh] = "small viewport height" — stays fixed even when the
      iOS/Android soft keyboard opens, preventing the whole page from jumping.
      overflow-y-auto lets the form scroll if the keyboard pushes it up.
    */
    <div
      className="min-h-[100svh] overflow-y-auto overscroll-none flex flex-col items-center relative"
      style={{ background: "linear-gradient(160deg, #1a0505 0%, #6b1414 45%, #c0392b 100%)" }}
    >
      {/* Background decorations — pointer-events-none, won't interfere */}
      <div
        className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ff6b6b, transparent)" }}
      />
      <div
        className="absolute bottom-[-80px] left-[-40px] w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ff4444, transparent)" }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" aria-hidden>
        <defs>
          <pattern id="mdots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mdots)" />
      </svg>

      {/* Content wrapper — centred vertically with padding so it scrolls nicely */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-5 flex flex-col items-center justify-center py-10 gap-0">

        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-[28px] overflow-hidden mb-5 shadow-2xl flex-shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <img src="/logo.jpg" alt="L.FTTH Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">LTC FTTH Tracker</h1>
          <p className="text-white/60 text-sm font-medium tracking-wide text-center">
            ລະບົບຕິດຕາມສະຖານະ ແລະ ບັນຫາຂັດຂ້ອງ ຂອງລູກຄ້າອິນເຕີເນັດ
          </p>
        </div>

        {/* Glass card */}
        <div
          className={`w-full rounded-3xl overflow-hidden transition-transform duration-200 ${shake ? "[animation:shake_0.45s_ease]" : ""}`}
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <div className="px-7 py-8">
            <div className="mb-7">
              <h2 className="text-xl font-black text-white mb-1">ຍິນດີຕ້ອນຮັບ</h2>
              <p className="text-white/50 text-sm">ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອດຳເນີນງານ</p>
            </div>
            <LoginForm
              isAdmin={isAdmin} mode={mode}
              username={username} onUsernameChange={handleUsernameChange}
              password={password} onPasswordChange={(v) => { setPassword(v); setError(""); }}
              showPwd={showPwd} onTogglePwd={() => setShowPwd(p => !p)}
              otp={otp} onOtpChange={(v) => { setOtp(v); setError(""); }}
              otpSent={otpSent} otpLoading={otpLoading}
              onRequestOTP={handleRequestOTP}
              onSubmit={handleSubmit}
              canSubmit={canSubmit} loading={loading} error={error}
            />
          </div>
        </div>

        <p className="mt-8 text-[10px] text-white/25 text-center tracking-wider">
          LTC FTTH Tracker v1.0
        </p>
      </div>
    </div>
  );
}
