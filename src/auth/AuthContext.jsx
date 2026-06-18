// ════════════════════════════════════════════════════════════════
// AuthContext.jsx
// ຈັດການ authentication state ແລະ staff permissions ທົ່ວລະບົບ
// ════════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase, staffFromDb, staffToDb } from "@/lib/supabase";
import { setAdminPassword, getStaffPermissions, setStaffPermissions } from "@/lib/store/db";
import { generateOTP, sendOTPToTelegram } from "@/lib/telegram";
import { canAccess as _canAccess } from "@/lib/permissions";

export const ADMIN_USERNAME = "s14y2";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ftth_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pendingOTP, setPendingOTP] = useState(null);
  const [otpExpiry, setOtpExpiry] = useState(null);

  const [staffList, setStaffList] = useState([]);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const refreshStaff = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("staff")
        .select("*")
        .order("created_at");
      setStaffList((data ?? []).map(staffFromDb));
    } catch {
      setStaffList([]);
    }
    setStaffLoaded(true);
  }, []);

  useEffect(() => {
    refreshStaff();
  }, [refreshStaff]);

  const login = useCallback((username, role, displayName, phone, permissions) => {
    const authUser = { username, role, displayName, phone, permissions: permissions ?? null };
    setUser(authUser);
    sessionStorage.setItem("ftth_auth_user", JSON.stringify(authUser));
  }, []);

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("ftth_auth_user");
  };

  const requestAdminOTP = useCallback(async () => {
    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000;
    setPendingOTP(otp);
    setOtpExpiry(expiry);
    const sent = await sendOTPToTelegram(otp);
    return sent;
  }, []);

  const verifyAdminOTP = useCallback((inputOtp) => {
    if (!pendingOTP || !otpExpiry) return false;
    if (Date.now() > otpExpiry) {
      setPendingOTP(null);
      setOtpExpiry(null);
      return false;
    }
    if (inputOtp.trim() === pendingOTP) {
      setPendingOTP(null);
      setOtpExpiry(null);
      return true;
    }
    return false;
  }, [pendingOTP, otpExpiry]);

  const verifyStaff = useCallback(async (username, password) => {
    const u = username.trim().toLowerCase();

    if (u === ADMIN_USERNAME) {
      return null;
    }

    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("username", u)
      .single();

    if (error) {
      console.error("[verifyStaff] Supabase error:", error);
      return null;
    }
    if (!data) return null;
    if (data.password_hash !== password.trim()) {
      console.warn("[verifyStaff] password mismatch for user:", u);
      return null;
    }

    const staff = staffFromDb(data);
    const permissions = await getStaffPermissions(u);
    return { ...staff, permissions };
  }, []);

  const addStaff = useCallback(async (s) => {
    const row = staffToDb(s);
    const { error } = await supabase.from("staff").insert(row);
    if (error) {
      if (error.code === "23505") throw new Error("ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ");
      throw error;
    }
    await refreshStaff();
  }, [refreshStaff]);

  const updateStaff = useCallback(async (username, patch) => {
    const u = username.toLowerCase();

    if (u !== ADMIN_USERNAME) {
      const row = staffToDb(patch);
      const { error } = await supabase.from("staff").update(row).eq("username", u);
      if (error) throw error;
    }

    if (patch.password) {
      await setAdminPassword(patch.password);
    }

    setUser(prev => {
      if (!prev || prev.username.toLowerCase() !== u) return prev;
      const newUser = { ...prev, ...patch };
      sessionStorage.setItem("ftth_auth_user", JSON.stringify(newUser));
      return newUser;
    });

    await refreshStaff();
  }, [refreshStaff]);

  const deleteStaff = useCallback(async (username) => {
    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("username", username.toLowerCase());
    if (error) throw error;
    await refreshStaff();
  }, [refreshStaff]);

  const changeAdminPassword = useCallback(async (newPw) => {
    await setAdminPassword(newPw);
  }, []);

  const updateStaffPermissions = useCallback(async (username, perms) => {
    await setStaffPermissions(username, perms);
    setUser(prev => {
      if (!prev || prev.username.toLowerCase() !== username.toLowerCase()) return prev;
      const newUser = { ...prev, permissions: perms };
      sessionStorage.setItem("ftth_auth_user", JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const canAccess = useCallback((key) => _canAccess(user, key), [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        staffList,
        staffLoaded,
        addStaff,
        updateStaff,
        deleteStaff,
        verifyStaff,
        refreshStaff,
        changeAdminPassword,
        requestAdminOTP,
        verifyAdminOTP,
        updateStaffPermissions,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
