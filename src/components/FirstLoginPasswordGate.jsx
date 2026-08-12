import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthPage from "../pages/AuthPage";

/**
 * วาง component นี้ครอบหน้าหลักของระบบ เพื่อป้องกันการ refresh แล้วข้ามหน้าเปลี่ยนรหัสผ่าน
 *
 * ตัวอย่าง:
 * <FirstLoginPasswordGate session={session}>
 *   <MainApp />
 * </FirstLoginPasswordGate>
 */
export default function FirstLoginPasswordGate({ session, children }) {
  const [checking, setChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkPasswordStatus() {
      setError("");

      const userId = session?.user?.id;

      if (!userId) {
        if (active) {
          setMustChangePassword(false);
          setChecking(false);
        }
        return;
      }

      setChecking(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profile) {
        console.error("PASSWORD GATE ERROR:", profileError);
        setError("ตรวจสอบสถานะรหัสผ่านไม่ได้ กรุณาติดต่อผู้ดูแลระบบ");
        setMustChangePassword(true);
        setChecking(false);
        return;
      }

      setMustChangePassword(profile.must_change_password === true);
      setChecking(false);
    }

    checkPasswordStatus();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-bold text-[#7f1324] shadow-xl">
          กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm font-medium text-rose-700 shadow-xl">
          {error}
        </div>
      </div>
    );
  }

  if (session?.user && mustChangePassword) {
    return (
      <AuthPage
        embedded
        onClose={() => setMustChangePassword(false)}
      />
    );
  }

  return children;
}
