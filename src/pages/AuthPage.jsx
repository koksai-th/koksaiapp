/*
 AuthPage_clean_fixed.jsx

ตรวจสอบ:
- ไม่พบ function ที่ประกาศแล้วไม่มีการใช้งาน
- ไม่พบ import ที่ไม่มีการใช้งาน
- ไม่ลบ validation / authentication / push notification logic
- คง flow login, register และ change-password เดิม

Source: AuthPage(5).jsx
*/

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import hqLogo from "/hq-logo.png";
import { HQ_ENG_NAME, HQ_THAI_NAME } from "../lib/core";
import { supabase } from "../lib/supabaseClient";

const ALLOW_SELF_REGISTRATION = false;

function mapError(err) {
  const m = String(err?.message || "").toLowerCase();

  if (m.includes("invalid")) return "User หรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล";
  if (m.includes("network")) return "อินเทอร์เน็ตมีปัญหา";
  if (m.includes("fetch")) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
  if (m.includes("password should be at least"))
    return "รหัสผ่านใหม่สั้นเกินไป";
  if (m.includes("same password"))
    return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";

  return "เกิดข้อผิดพลาด กรุณาลองใหม่";
}

const emptyRegisterForm = {
  username: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  phone: "",
  email: "",
  isRescueVolunteer: false,
  rescueStation: "",
};

const initialTouched = {
  username: false,
  password: false,
  confirmPassword: false,
  fullName: false,
  phone: false,
  email: false,
  rescueStation: false,
};

const emptyPasswordChangeForm = {
  password: "",
  confirmPassword: "",
};

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatPhone(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function passwordStrength(password) {
  const value = String(password || "");
  let score = 0;

  if (value.length >= 6) score += 1;
  if (/[A-Z]/.test(value) || /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return { label: "อ่อน", color: "bg-rose-500", width: "25%" };
  if (score === 2)
    return { label: "พอใช้", color: "bg-amber-500", width: "50%" };
  if (score === 3) return { label: "ดี", color: "bg-[#c49a3d]", width: "75%" };
  return { label: "แข็งแรง", color: "bg-emerald-500", width: "100%" };
}

const FormInput = React.memo(function FormInput({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  rightSlot = null,
  autoComplete,
  error = "",
  success = "",
  hint = "",
  inputMode,
  maxLength,
  id,
  name,
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-slate-700">{label}</div>
      <div
        className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.08)] transition ${
          error
            ? "border-rose-400 bg-rose-50"
            : success
              ? "border-emerald-400 bg-emerald-50"
              : "border-[#d4a84f] bg-white"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${error ? "text-rose-600" : "text-[#7f1324]"}`}
        />
        <input
          id={id || name}
          name={name || id}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {rightSlot}
      </div>
      {error ? (
        <div className="mt-1.5 text-xs font-medium text-rose-600">{error}</div>
      ) : null}
      {!error && success ? (
        <div className="mt-1.5 text-xs font-medium text-emerald-600">
          {success}
        </div>
      ) : null}
      {!error && !success && hint ? (
        <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
      ) : null}
    </label>
  );
});


async function saveDeviceToken(token, user) {
  if (!token || !user?.id) return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rescue_station")
      .eq("id", user.id)
      .maybeSingle();
    await saveDeviceTokenForUser(token, user, profile || {});
  } catch (err) {
    console.error("SAVE DEVICE TOKEN ERROR:", err);
  }
}

export default function AuthPage({ initialMode = "login", embedded = false, onClose = null }) {
  const [mode, setMode] = useState(ALLOW_SELF_REGISTRATION ? initialMode : "login");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forcedPasswordUser, setForcedPasswordUser] = useState(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [changePasswordForm, setChangePasswordForm] = useState(
    emptyPasswordChangeForm,
  );
  const [registerTouched, setRegisterTouched] = useState(initialTouched);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const debouncedUsername = useDebouncedValue(registerForm.username, 350);

  const updateLogin = React.useCallback((key, value) => {
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateChangePassword = React.useCallback((key, value) => {
    setChangePasswordForm((prev) => ({ ...prev, [key]: value }));
    setPasswordUpdated(false);
  }, []);

  const updateRegister = React.useCallback((key, value) => {
    let nextValue = value;

    if (key === "username") {
      nextValue = String(value || "").replace(/\s/g, "");
      setUsernameAvailable(null);
    }

    if (key === "email") {
      nextValue = String(value || "").replace(/\s/g, "");
    }

    if (key === "phone") {
      nextValue = formatPhone(value);
    }

    setRegisterForm((prev) => {
      const next = { ...prev, [key]: nextValue };

      if (key === "isRescueVolunteer" && value === false) {
        next.rescueStation = "";
      }

      return next;
    });
  }, []);

  const markTouched = (key) => {
    setRegisterTouched((prev) => ({ ...prev, [key]: true }));
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const registerValidation = useMemo(() => {
    const username = normalizeUsername(registerForm.username);
    const email = normalizeEmail(registerForm.email);
    const phoneDigits = registerForm.phone.replace(/\D/g, "");

    return {
      username: !username
        ? "กรุณากรอก User"
        : username.length < 6
          ? "User ต้องมีอย่างน้อย 6 ตัวอักษร"
          : !/^[a-z0-9._-]+$/i.test(username)
            ? "User ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง และขีดล่าง"
            : "",
      fullName: registerForm.fullName.trim() ? "" : "กรุณากรอกชื่อ-นามสกุล",
      phone: !phoneDigits
        ? "กรุณากรอกเบอร์โทร"
        : !/^0\d{9}$/.test(phoneDigits)
          ? "เบอร์โทรต้องเป็น 10 หลัก และขึ้นต้นด้วย 0"
          : "",
      email: !email
        ? "กรุณากรอกอีเมล"
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? "รูปแบบอีเมลไม่ถูกต้อง"
          : "",
      password: !registerForm.password
        ? "กรุณากรอกรหัสผ่าน"
        : registerForm.password.length < 6
          ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
          : "",
      confirmPassword: !registerForm.confirmPassword
        ? "กรุณายืนยันรหัสผ่าน"
        : registerForm.password !== registerForm.confirmPassword
          ? "ยืนยันรหัสผ่านไม่ตรงกัน"
          : "",
      rescueStation:
        registerForm.isRescueVolunteer && !registerForm.rescueStation
          ? "กรุณาเลือกจุดประจำ"
          : "",
    };
  }, [registerForm]);

  const isRegisterValid = useMemo(
    () => Object.values(registerValidation).every((msg) => !msg),
    [registerValidation],
  );

  const strength = useMemo(
    () => passwordStrength(registerForm.password),
    [registerForm.password],
  );

  const changePasswordValidation = useMemo(() => {
    const password = changePasswordForm.password;

    return {
      password: !password
        ? "กรุณากรอกรหัสผ่านใหม่"
        : password.length < 8
          ? "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"
          : !/[A-Za-z]/.test(password) || !/\d/.test(password)
            ? "รหัสผ่านใหม่ต้องมีตัวอักษรและตัวเลข"
            : password === loginForm.password
              ? "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม"
              : "",
      confirmPassword: !changePasswordForm.confirmPassword
        ? "กรุณายืนยันรหัสผ่านใหม่"
        : password !== changePasswordForm.confirmPassword
          ? "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน"
          : "",
    };
  }, [changePasswordForm, loginForm.password]);

  const isChangePasswordValid = useMemo(
    () => Object.values(changePasswordValidation).every((msg) => !msg),
    [changePasswordValidation],
  );

  const changePasswordStrength = useMemo(
    () => passwordStrength(changePasswordForm.password),
    [changePasswordForm.password],
  );

  useEffect(() => {
    setMode((currentMode) =>
      currentMode === "change-password"
        ? currentMode
        : ALLOW_SELF_REGISTRATION && initialMode === "register"
          ? "register"
          : "login",
    );
    setError("");
    setNotice("");
  }, [initialMode]);

  useEffect(() => {
    let active = true;

    async function restoreForcedPasswordChange() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      const user = sessionData?.session?.user;

      if (!active || sessionError || !user?.id) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .maybeSingle();

      if (!active || profileError || !profile) return;

      if (profile.must_change_password === true) {
        setForcedPasswordUser(user);
        setMode("change-password");
        setNotice(
          "กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ",
        );
      }
    }

    restoreForcedPasswordChange();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function checkUsernameAvailability() {
      const username = normalizeUsername(debouncedUsername);

      if (
        !username ||
        username.length < 6 ||
        !/^[a-z0-9._-]+$/i.test(username)
      ) {
        setCheckingUsername(false);
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);

      try {
        const { data: available, error: availabilityError } = await supabase.rpc(
          "is_username_available",
          { input_username: username },
        );

        if (!active) return;

        if (availabilityError) {
          console.warn("USERNAME AVAILABILITY ERROR:", availabilityError);
          setUsernameAvailable(null);
          return;
        }

        setUsernameAvailable(available === true);
      } catch {
        if (active) setUsernameAvailable(null);
      } finally {
        if (active) setCheckingUsername(false);
      }
    }

    if (mode === "register") {
      checkUsernameAvailability();
    }

    return () => {
      active = false;
    };
  }, [debouncedUsername, mode]);

  const handleLogin = async (e) => {
    e?.preventDefault();

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const username = normalizeUsername(loginForm.username);

      if (!username) {
        setError("กรุณากรอก User");
        return;
      }

      if (!loginForm.password) {
        setError("กรุณากรอกรหัสผ่าน");
        return;
      }

      const { data: loginEmail, error: lookupError } = await supabase.rpc(
        "get_email_by_username",
        { input_username: username },
      );

      if (lookupError || !loginEmail) {
        if (lookupError) console.error("USERNAME LOOKUP ERROR:", lookupError);
        setError("User หรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginForm.password,
        });

      if (loginError) {
        console.error("LOGIN ERROR:", loginError);
        setError(mapError(loginError));
        return;
      }

      const user = data?.user;

      if (!user?.id) {
        await supabase.auth.signOut({ scope: "local" });
        setError("ไม่พบข้อมูลผู้ใช้หลังเข้าสู่ระบบ");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("LOAD PASSWORD STATUS ERROR:", profileError);
        await supabase.auth.signOut({ scope: "local" });
        setError(
          "ตรวจสอบสถานะรหัสผ่านไม่ได้ กรุณาติดต่อผู้ดูแลระบบ",
        );
        return;
      }

      if (profile.must_change_password === true) {
        setForcedPasswordUser(user);
        setChangePasswordForm(emptyPasswordChangeForm);
        setPasswordUpdated(false);
        setMode("change-password");
        setNotice(
          "เข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ",
        );
        return;
      }

      // หลัง Login สำเร็จ ให้ตั้งค่า Permission อุปกรณ์ก่อนเข้าใช้งานระบบ
      // เพื่อขอ Location / Notification / Storage / Microphone ในขั้นตอนถัดไป
      const permissionSetupDone =
        localStorage.getItem("permission_setup");

      if (!permissionSetupDone) {
        window.location.href = "/permission-setup";
        return;
      }

      // RescueAppShell จะแสดงป๊อปอัพให้ผู้ใช้ตัดสินใจก่อนขอสิทธิ์จากระบบ
      // และบันทึก token หลังผู้ใช้กดอนุญาต
    } catch (err) {
      console.error("LOGIN CATCH ERROR:", err);
      setError(err?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e?.preventDefault();
    if (loading) return;

    clearMessages();

    if (!forcedPasswordUser?.id) {
      setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      setMode("login");
      return;
    }

    if (!passwordUpdated && !isChangePasswordValid) {
      setError("กรุณาตรวจสอบรหัสผ่านใหม่ให้ถูกต้อง");
      return;
    }

    setLoading(true);

    try {
      if (!passwordUpdated) {
        const { error: updatePasswordError } = await supabase.auth.updateUser({
          password: changePasswordForm.password,
        });

        if (updatePasswordError) throw updatePasswordError;
        setPasswordUpdated(true);
      }

      const { error: profileUpdateError } = await supabase.rpc(
        "complete_first_login_password_change",
      );

      if (profileUpdateError) {
        console.error("CLEAR PASSWORD FLAG ERROR:", profileUpdateError);
        setError(
          "เปลี่ยนรหัสผ่านสำเร็จแล้ว แต่บันทึกสถานะไม่สำเร็จ กรุณากดบันทึกอีกครั้งหรือติดต่อผู้ดูแลระบบ",
        );
        return;
      }

      setForcedPasswordUser(null);
      setPasswordUpdated(false);
      setChangePasswordForm(emptyPasswordChangeForm);
      setLoginForm({ username: "", password: "" });
      setNotice("เปลี่ยนรหัสผ่านสำเร็จ กำลังเข้าสู่ระบบ");

      if (embedded && typeof onClose === "function") {
        onClose();
        return;
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      } else {
        setMode("login");
      }
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      setError(mapError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    clearMessages();

    setRegisterTouched({
      username: true,
      password: true,
      confirmPassword: true,
      fullName: true,
      phone: true,
      email: true,
      rescueStation: true,
    });

    if (!isRegisterValid) {
      setError("กรุณาตรวจสอบข้อมูลสมัครสมาชิกให้ถูกต้อง");
      return;
    }

    if (usernameAvailable === false) {
      setError("User นี้ถูกใช้งานแล้ว");
      return;
    }

    const username = normalizeUsername(registerForm.username);
    const email = normalizeEmail(registerForm.email);

    setLoading(true);

    try {
      const { data: available, error: availabilityError } = await supabase.rpc(
        "is_username_available",
        { input_username: username },
      );

      if (availabilityError) throw availabilityError;
      if (available !== true) {
        setError("User นี้ถูกใช้งานแล้ว");
        return;
      }

      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}` : undefined;

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password: registerForm.password,
          options: {
            data: {
              username,
              full_name: registerForm.fullName.trim(),
              phone: registerForm.phone.replace(/\D/g, ""),
              is_volunteer: registerForm.isRescueVolunteer,
              rescue_station: registerForm.isRescueVolunteer
                ? registerForm.rescueStation
                : null,
            },
          },
        });

      if (signUpError) throw signUpError;

      if (!signUpData?.user?.id) {
        throw new Error("ไม่พบรหัสผู้ใช้หลังสมัครสมาชิก");
      }

      // The database trigger creates a restricted profile from auth metadata.
      // Never let the browser assign staff roles or activate its own account.

      setNotice(
        "สมัครสมาชิกสำเร็จ กรุณาเปิดอีเมลเพื่อกดยืนยันตัวตนก่อนเข้าสู่ระบบ พบปัญหาการเข้าสู่ระบบ ติดต่อเจ้าหน้าที่",
      );
      setRegisterForm(emptyRegisterForm);
      setRegisterTouched(initialTouched);
      setUsernameAvailable(null);
      setMode("login");
    } catch (err) {
      setError(err?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const usernameSuccess =
    registerTouched.username &&
    !registerValidation.username &&
    usernameAvailable === true
      ? "User นี้สามารถใช้งานได้"
      : "";

  const usernameHint = checkingUsername
    ? "กำลังตรวจสอบชื่อผู้ใช้..."
    : "ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดกลาง และขีดล่าง";

  return (
    <div
      className={embedded
        ? "bg-transparent px-0 py-0"
        : "min-h-screen bg-[radial-gradient(circle_at_top,#4b0d17_0%,#24070d_18%,#f7f3ea_18%,#f4eee1_58%,#ece0c2_100%)] px-4 py-6 sm:px-6"}
    >
      <div
        className={embedded
          ? "mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          : "mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]"}
      >
        <div className="hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[#4f0d18] via-[#6f1121] to-[#8d1b1b] p-8 text-white shadow-2xl lg:block">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/15 bg-black/20 p-3">
              <img
                src={hqLogo}
                alt={HQ_THAI_NAME}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8e7b0]">
                {HQ_ENG_NAME}
              </div>
              <div className="mt-1 text-2xl font-black leading-tight">
                {HQ_THAI_NAME}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div className="rounded-[26px] bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3 text-lg font-black">
                <ShieldCheck className="h-6 w-6 text-[#f8e7b0]" />
                ระบบสำหรับเจ้าหน้าที่ภายใน
              </div>
              <p className="mt-2 text-sm leading-7 text-white/85">
                บัญชีผู้ใช้ต้องได้รับการสร้างและอนุมัติโดยผู้ดูแลระบบเท่านั้น
                บุคคลทั่วไปไม่สามารถสมัครหรือเข้าใช้งานได้
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/10 p-4">
                <div className="text-sm font-bold text-[#f8e7b0]">
                  บัญชีที่อนุมัติแล้ว
                </div>
                <div className="mt-1 text-xs text-white/80">
                  ผู้ดูแลสร้างบัญชีให้เฉพาะเจ้าหน้าที่
                </div>
              </div>
              <div className="rounded-[24px] bg-white/10 p-4">
                <div className="text-sm font-bold text-[#f8e7b0]">
                  ควบคุมสิทธิ์ตามหน้าที่
                </div>
                <div className="mt-1 text-xs text-white/80">
                  แยกผู้ดูแล ศูนย์สั่งการ ผู้บริหาร และอาสาสมัคร
                </div>
              </div>
              <div className="rounded-[24px] bg-white/10 p-4">
                <div className="text-sm font-bold text-[#f8e7b0]">
                  UX เร็วและนิ่ง
                </div>
                <div className="mt-1 text-xs text-white/80">
                  พิมพ์ลื่น ไม่หลุดโฟกัส และฟอร์แมตเบอร์โทรอัตโนมัติ
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#7f1324]/10 p-2">
                <img
                  src={hqLogo}
                  alt={HQ_THAI_NAME}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {HQ_ENG_NAME}
                </div>
                <div className="text-base font-black text-[#7f1324]">
                  {HQ_THAI_NAME}
                </div>
              </div>
            </div>

            {embedded &&
            mode !== "change-password" &&
            typeof onClose === "function" ? (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-300 bg-gradient-to-b from-white to-slate-200 px-4 py-2 text-sm font-bold text-slate-700 shadow-[0_4px_0_#cbd5e1,0_10px_20px_rgba(15,23,42,0.10)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#cbd5e1] hover:brightness-105"
                >
                  ปิด
                </button>
              </div>
            ) : null}

            {mode === "change-password" ? (
              <div className="mt-4 rounded-2xl border border-[#e7d3a4] bg-[#fff9e9] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-black text-[#7f1324]">
                  <LockKeyhole className="h-4 w-4" />
                  ตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน
                </div>
                <div className="mt-1 text-xs leading-6 text-slate-600">
                  เพื่อความปลอดภัย ระบบจะไม่อนุญาตให้ข้ามขั้นตอนนี้
                </div>
              </div>
            ) : (
              <div className="mt-4 inline-flex rounded-2xl border border-[#e7d3a4] bg-[#f7f0de] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setMode("login");
                }}
                className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "login"
                    ? "border border-[#7f1324] bg-gradient-to-b from-[#a91d31] to-[#7f1324] text-white shadow-[0_4px_0_#5f0f1b,0_10px_20px_rgba(127,19,36,0.26)] active:translate-y-[2px] active:shadow-[0_2px_0_#5f0f1b]"
                    : "border border-transparent text-slate-600 hover:bg-white/70"
                }`}
              >
                เข้าสู่ระบบ
              </button>
              {ALLOW_SELF_REGISTRATION ? (
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode("register");
                  }}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                    mode === "register"
                      ? "border border-[#7f1324] bg-gradient-to-b from-[#a91d31] to-[#7f1324] text-white shadow-[0_4px_0_#5f0f1b,0_10px_20px_rgba(127,19,36,0.26)] active:translate-y-[2px] active:shadow-[0_2px_0_#5f0f1b]"
                      : "border border-transparent text-slate-600 hover:bg-white/70"
                  }`}
                >
                  สมัครสมาชิก
                </button>
              ) : null}
              </div>
            )}

            {notice ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="px-5 py-5 sm:px-7 sm:py-6">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <FormInput
                  id="login-username"
                  name="username"
                  icon={UserRound}
                  label="Username"
                  value={loginForm.username}
                  onChange={(v) => updateLogin("username", v)}
                  placeholder="กรอก Username"
                  autoComplete="username"
                />

                <FormInput
                  id="login-password"
                  name="password"
                  icon={LockKeyhole}
                  label="รหัสผ่าน"
                  type={showLoginPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(v) => updateLogin("password", v)}
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      title={showLoginPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <div className="rounded-2xl border border-[#e7d3a4] bg-[#fff9e9] px-4 py-3 text-xs leading-6 text-slate-600">
                  เฉพาะอาสาสมัครหน่วยกู้ภัยกกไทร เท่านั้น!! หากยังไม่มีบัญชีเข้าใช้งาน กรุณาติดต่อ ผู้ดูแลระบบ
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl border border-[#f0cf88] bg-gradient-to-b from-[#c79a3b] via-[#9d1b2f] to-[#7f1324] px-4 py-3 text-sm font-black text-white shadow-[0_6px_0_#5f0f1b,0_14px_28px_rgba(127,19,36,0.30)] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_#5f0f1b] disabled:opacity-60"
                >
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                  เข้าใช้งานด้วย <span className="font-bold">Username + รหัสผ่าน</span>{" "}
                  หากยังไม่มีบัญชีเข้าใช้งาน กรุณาติดต่อ ผู้ดูแลระบบ
                </div>
              </form>
            ) : mode === "change-password" ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="rounded-2xl border border-[#e7d3a4] bg-[#fff9e9] px-4 py-3 text-xs leading-6 text-slate-600">
                  รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข
                  และต้องไม่ซ้ำกับรหัสผ่านชั่วคราว
                </div>

                <FormInput
                  id="new-password"
                  name="newPassword"
                  icon={LockKeyhole}
                  label="รหัสผ่านใหม่"
                  type={showNewPassword ? "text" : "password"}
                  value={changePasswordForm.password}
                  onChange={(v) => updateChangePassword("password", v)}
                  placeholder="กรอกรหัสผ่านใหม่"
                  autoComplete="new-password"
                  error={
                    changePasswordForm.password
                      ? changePasswordValidation.password
                      : ""
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
                      title={showNewPassword ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                {changePasswordForm.password ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        ความแข็งแรงรหัสผ่าน
                      </span>
                      <span className="font-bold text-slate-700">
                        {changePasswordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className={`h-2 rounded-full ${changePasswordStrength.color}`}
                        style={{ width: changePasswordStrength.width }}
                      />
                    </div>
                  </div>
                ) : null}

                <FormInput
                  id="confirm-new-password"
                  name="confirmNewPassword"
                  icon={LockKeyhole}
                  label="ยืนยันรหัสผ่านใหม่"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={changePasswordForm.confirmPassword}
                  onChange={(v) =>
                    updateChangePassword("confirmPassword", v)
                  }
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  autoComplete="new-password"
                  error={
                    changePasswordForm.confirmPassword
                      ? changePasswordValidation.confirmPassword
                      : ""
                  }
                  success={
                    changePasswordForm.confirmPassword &&
                    !changePasswordValidation.confirmPassword
                      ? "ยืนยันรหัสผ่านตรงกัน"
                      : ""
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmNewPassword((prev) => !prev)
                      }
                      aria-label={showConfirmNewPassword ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                      title={showConfirmNewPassword ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <button
                  type="submit"
                  disabled={
                    loading || (!passwordUpdated && !isChangePasswordValid)
                  }
                  className="w-full rounded-2xl border border-[#f0cf88] bg-gradient-to-b from-[#c79a3b] via-[#9d1b2f] to-[#7f1324] px-4 py-3 text-sm font-black text-white shadow-[0_6px_0_#5f0f1b,0_14px_28px_rgba(127,19,36,0.30)] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_#5f0f1b] disabled:opacity-60"
                >
                  {passwordUpdated
                    ? "บันทึกสถานะอีกครั้ง"
                    : loading
                      ? "กำลังเปลี่ยนรหัสผ่าน..."
                      : "บันทึกรหัสผ่านใหม่"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    id="register-username"
                    name="username"
                    icon={UserRound}
                    label="User"
                    value={registerForm.username}
                    onChange={(v) => updateRegister("username", v)}
                    onBlur={() => markTouched("username")}
                    placeholder="เช่น koksai1"
                    autoComplete="username"
                    error={
                      registerTouched.username
                        ? registerValidation.username ||
                          (usernameAvailable === false
                            ? "User นี้ถูกใช้งานแล้ว"
                            : "")
                        : ""
                    }
                    success={usernameSuccess}
                    hint={usernameHint}
                  />

                  <FormInput
                    id="register-email"
                    name="email"
                    icon={Mail}
                    label="อีเมล"
                    type="email"
                    value={registerForm.email}
                    onChange={(v) => updateRegister("email", v)}
                    onBlur={() => markTouched("email")}
                    placeholder="name@example.com"
                    autoComplete="email"
                    error={
                      registerTouched.email ? registerValidation.email : ""
                    }
                    success={
                      registerTouched.email && !registerValidation.email
                        ? "รูปแบบอีเมลถูกต้อง"
                        : ""
                    }
                  />

                  <FormInput
                    id="register-full-name"
                    name="fullName"
                    icon={UserRound}
                    label="ชื่อ-นามสกุล"
                    value={registerForm.fullName}
                    onChange={(v) => updateRegister("fullName", v)}
                    onBlur={() => markTouched("fullName")}
                    placeholder="กรอกชื่อ-นามสกุล"
                    autoComplete="name"
                    error={
                      registerTouched.fullName
                        ? registerValidation.fullName
                        : ""
                    }
                  />

                  <FormInput
                    id="register-phone"
                    name="phone"
                    icon={Phone}
                    label="เบอร์โทร"
                    value={registerForm.phone}
                    onChange={(v) => updateRegister("phone", v)}
                    onBlur={() => markTouched("phone")}
                    placeholder="080-000-0000"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={12}
                    error={
                      registerTouched.phone ? registerValidation.phone : ""
                    }
                    success={
                      registerTouched.phone && !registerValidation.phone
                        ? "เบอร์โทรพร้อมใช้งาน"
                        : ""
                    }
                    hint="ระบบจัดรูปแบบเบอร์โทรอัตโนมัติ"
                  />

                  <div className="sm:col-span-2">
                    <FormInput
                      id="register-password"
                      name="new-password"
                      icon={LockKeyhole}
                      label="รหัสผ่าน"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(v) => updateRegister("password", v)}
                      onBlur={() => markTouched("password")}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      autoComplete="new-password"
                      error={
                        registerTouched.password
                          ? registerValidation.password
                          : ""
                      }
                      rightSlot={
                        <button
                          type="button"
                          onClick={() =>
                            setShowRegisterPassword((prev) => !prev)
                          }
                          aria-label={showRegisterPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                          title={showRegisterPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                          className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />
                    {registerForm.password ? (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200">
                            ความแข็งแรงรหัสผ่าน
                          </span>
                          <span className="font-bold text-slate-700">
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div
                            className={`h-2 rounded-full ${strength.color}`}
                            style={{ width: strength.width }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <FormInput
                  id="register-confirm-password"
                  name="confirmPassword"
                  icon={LockKeyhole}
                  label="ยืนยันรหัสผ่าน"
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  value={registerForm.confirmPassword}
                  onChange={(v) => updateRegister("confirmPassword", v)}
                  onBlur={() => markTouched("confirmPassword")}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  autoComplete="new-password"
                  error={
                    registerTouched.confirmPassword
                      ? registerValidation.confirmPassword
                      : ""
                  }
                  success={
                    registerTouched.confirmPassword &&
                    !registerValidation.confirmPassword &&
                    registerForm.confirmPassword
                      ? "ยืนยันรหัสผ่านตรงกัน"
                      : ""
                  }
                  rightSlot={
                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterConfirmPassword((prev) => !prev)
                      }
                      aria-label={showRegisterConfirmPassword ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                      title={showRegisterConfirmPassword ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-slate-500 transition hover:bg-slate-200"
                    >
                      {showRegisterConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <div className="rounded-2xl border-2 border-[#d4a84f] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.06)]">
                  <div className="mb-2 text-sm font-bold text-slate-700">
                    เป็นอาสาสมัครกู้ภัยกกไทรหรือไม่
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        id="rescue-volunteer-yes"
                        type="radio"
                        name="isRescueVolunteer"
                        checked={registerForm.isRescueVolunteer === true}
                        onChange={() => updateRegister("isRescueVolunteer", true)}
                        className="h-4 w-4 accent-[#7f1324]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        ใช่
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        id="rescue-volunteer-no"
                        type="radio"
                        name="isRescueVolunteer"
                        checked={registerForm.isRescueVolunteer === false}
                        onChange={() => updateRegister("isRescueVolunteer", false)}
                        className="h-4 w-4 accent-[#7f1324]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        ไม่ใช่
                      </span>
                    </label>
                  </div>

                  {registerForm.isRescueVolunteer ? (
                    <div className="mt-4">
                      <label className="block">
                        <div className="mb-1.5 text-sm font-bold text-slate-700">
                          ประจำจุดใด
                        </div>

                        <select
                          id="rescue-station"
                          name="rescueStation"
                          autoComplete="organization"
                          value={registerForm.rescueStation}
                          onChange={(e) =>
                            updateRegister("rescueStation", e.target.value)
                          }
                          onBlur={() => markTouched("rescueStation")}
                          className={`w-full rounded-2xl border-2 px-4 py-3 text-sm outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.08)] ${
                            registerTouched.rescueStation &&
                            registerValidation.rescueStation
                              ? "border-rose-400 bg-rose-50 text-slate-900"
                              : "border-[#d4a84f] bg-white text-slate-900"
                          }`}
                        >
                          <option value="">-- เลือกจุดประจำ --</option>
                          <option value="หล่มสัก">หล่มสัก</option>
                          <option value="หล่มเก่า">หล่มเก่า</option>
                          <option value="เขาค้อ">เขาค้อ</option>
                          <option value="น้ำหนาว">น้ำหนาว</option>
                          <option value="เมือง">เมือง</option>
                          <option value="ศรีเทพ">ศรีเทพ</option>
                        </select>

                        {registerTouched.rescueStation &&
                        registerValidation.rescueStation ? (
                          <div className="mt-1.5 text-xs font-medium text-rose-600">
                            {registerValidation.rescueStation}
                          </div>
                        ) : null}
                      </label>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={
                    loading || checkingUsername || usernameAvailable === false
                  }
                  className="w-full rounded-2xl border border-[#f0cf88] bg-gradient-to-b from-[#c79a3b] via-[#9d1b2f] to-[#7f1324] px-4 py-3 text-sm font-black text-white shadow-[0_6px_0_#5f0f1b,0_14px_28px_rgba(127,19,36,0.30)] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_#5f0f1b] disabled:opacity-60"
                >
                  {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                </button>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                  หลังสมัคร ระบบจะส่งอีเมลยืนยันตัวตนไปยังอีเมลที่กรอกไว้
                  ยืนยันอีเมลก่อนเข้าใช้งานระบบ
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-6 py-4 text-sm font-bold text-[#7f1324] shadow-xl">
            {mode === "login"
              ? "กำลังเข้าสู่ระบบ..."
              : mode === "change-password"
                ? "กำลังเปลี่ยนรหัสผ่าน..."
                : "กำลังสมัครสมาชิก..."}
          </div>
        </div>
      ) : null}
    </div>
  );
}
