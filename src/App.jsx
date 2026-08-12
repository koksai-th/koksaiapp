import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  FileHeart,
  HeartPulse,
  LogOut,
  Menu,
  Skull,
  Users,
  Settings,
  X,
} from "lucide-react";
import hqLogo from "/hq-logo.png";
import bgLogo from "/bgload.png";
import Login from "./pages/AuthPage";
import FirstLoginPasswordGate from "./components/FirstLoginPasswordGate";
import PermissionSetup from "./pages/PermissionSetup";
import {
  TABS,
  HQ_ENG_NAME,
  HQ_THAI_NAME,
  buildAlertMessage,
  createAlertDraft,
  createInitialForm,
  parseGps,
  getCurrentDate,
  getCurrentTime,
} from "./lib/core";
import {
  createIncidentInDb,
  createQuickIncidentInDb,
  deleteIncidentFromDb,
  getNextCaseIdFromDb,
  incidentRowToForm,
  loadIncidentsFromDb,
  recordIncidentTimelineEvent,
  updateIncidentInDb,
} from "./lib/incidents";
import { supabase } from "./lib/supabaseClient";
import { getMessaging, getToken, isSupported, onMessage } from "@firebase/messaging";
import { firebaseApp } from "./lib/firebase";
import { initPushNotifications } from "./lib/pushNotifications";
import { getActiveDeviceTokenForUser, saveDeviceTokenForUser } from "./lib/deviceTokens";
import { getRoleLabel, isRescuePersonnel } from "./lib/roles";
import { getUnreadNotificationCount, markNotificationRead } from "./lib/notifications";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const IncidentFormPage = lazy(() => import("./pages/IncidentFormPage"));
const CommandCenterPage = lazy(() => import("./pages/CommandCenterPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const PersonnelPage = lazy(() => import("./pages/PersonnelPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const IncidentDetailPanel = lazy(() => import("./pages/IncidentDetailPanel"));
const UsersAdminPage = lazy(() => import("./pages/UsersAdminPage"));
const AmbulancesAdminPage = lazy(() => import("./pages/AmbulancesAdminPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));


function LoadingScreenStyle() {
  return (
    <style>{`
      .loading-bar {
        width: 45%;
        animation: loadingSweep 1.4s ease-in-out infinite;
        box-shadow: 0 0 14px rgba(255, 217, 120, 0.55);
      }

      @keyframes loadingSweep {
        0% {
          transform: translateX(-110%);
          opacity: 0.72;
        }
        50% {
          transform: translateX(110%);
          opacity: 1;
        }
        100% {
          transform: translateX(240%);
          opacity: 0.72;
        }
      }
    `}</style>
  );
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black text-white">
      <LoadingScreenStyle />
      <div
        className="absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: `url(${bgLogo})`,
          backgroundSize: "min(72vw, 760px)",
        }}
      />
      <div className="absolute -left-16 top-20 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
      <div className="absolute -right-16 top-16 h-72 w-72 rounded-full bg-[#d9b75f]/16 blur-3xl" />
      <div className="absolute bottom-10 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-[#ffe3a3]/40 bg-white/10 p-3 shadow-[0_18px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-md sm:h-32 sm:w-32">
          <img
            src={hqLogo}
            alt="HQ Logo"
            className="h-full w-full animate-pulse object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.28)]"
          />
        </div>

        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.32em] text-[#f7dca2] sm:text-xs">
          KOKSAI RESCUE ASSOCIATION HEADQUARTERS
        </div>
        <div className="mt-2 text-base font-black tracking-[0.18em] text-white/88 sm:text-lg">
          🚑 Loading Please wait...
        </div>
        <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-white/10 sm:w-72">
          <div className="loading-bar h-full w-1/2 rounded-full bg-gradient-to-r from-[#7f1324] via-[#d7b65f] to-[#fff3c4]" />
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_28%,black_88%)]" />
    </div>
  );
}

function PageLoading() {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/90 px-5 py-10 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#7f1324]" />
      <div className="mt-4 text-sm font-black text-slate-700">กำลังโหลดหน้า...</div>
    </div>
  );
}

function formatCommandShortDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function getCommandCaseTypeLabel(type) {
  if (type === "accident") return "อุบัติเหตุ";
  if (type === "emergency") return "ผู้ป่วยฉุกเฉิน";
  if (type === "public_service") return "บริการสาธารณะ";
  return "-";
}

function buildCommandCenterMessage(draft) {
  const coords = parseGps(draft?.gps || "");
  const mapsLink =
    coords?.lat != null && coords?.lng != null
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : "-";

  return [
    "🚑 แจ้งเหตุ หน่วยกู้ภัยกกไทร",
    `วันที่ ${formatCommandShortDate(draft?.caseDate)}`,
    `เวลา ${draft?.caseTime || "-"}`,
    `ประเภท ${getCommandCaseTypeLabel(draft?.caseType)}`,
    `รายละเอียด ${draft?.details || draft?.place || "-"}`,
    `สถานที่เกิดเหตุ ${draft?.place || "-"}`,
    `ตำบล ${draft?.tambon || "-"}`,
    `เบอร์ผู้แจ้งเหตุ ${draft?.reporterPhone || "-"}`,
    `Google Maps ${mapsLink}`,
  ].join("\n");
}


function EmergencyHeaderAlertBar() {
  return (
    <div className="rescue-alert-bar pointer-events-none absolute left-3 right-3 top-3 z-20 flex min-h-9 items-center justify-between gap-3 rounded-xl border border-[#e1c578]/55 bg-[#4f0a15]/88 px-3 py-2 text-white shadow-[0_8px_20px_rgba(29,4,10,0.22)] backdrop-blur sm:left-4 sm:right-4 lg:left-5 lg:right-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#e8c86f] shadow-[0_0_0_4px_rgba(232,200,111,0.14)]" />
        <span className="truncate text-[10px] font-black tracking-[0.08em] text-[#fff4cf] sm:text-xs">
          หน่วยกู้ภัยกกไทร จังหวัดเพชรบูรณ์ • พร้อมปฏิบัติการตลอด 24 ชั่วโมง โทร 056 701 813 วิทยุความถี่ 168.775 Mhz
        </span>
      </div>
      <span className="shrink-0 rounded-lg border border-[#ead58f]/45 bg-white/10 px-2 py-1 text-[10px] font-black text-[#ffe8a7] sm:text-xs">
        ฉุกเฉิน 1669
      </span>
    </div>
  );
}

function EmergencyHeaderStyle() {
  return (
    <style>{`
      .rescue-alert-bar {
        background-image:
          linear-gradient(90deg, rgba(255,255,255,0.05), transparent 34%),
          repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 9px);
      }
    `}</style>
  );
}

function CommandCenterLoginEmbeddedStyle() {
  return (
    <style>{`
      .command-login-shell > div {
        min-height: auto !important;
        padding: 0 !important;
        background: transparent !important;
      }

      .command-login-shell > div > div {
        min-height: auto !important;
        max-width: none !important;
        grid-template-columns: minmax(0,1fr) !important;
        gap: 0 !important;
      }

      .command-login-shell > div > div > div:first-child {
        display: none !important;
      }

      .command-login-shell > div > div > div:last-child {
        overflow: visible !important;
        border-radius: 28px !important;
        border: 1px solid rgba(255, 219, 143, 0.42) !important;
        background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,249,239,0.94)) !important;
        box-shadow: 0 20px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.9) !important;
      }

      .command-login-shell > div > div > div:last-child > div:first-child {
        border-bottom: 1px solid rgba(212, 168, 74, 0.18) !important;
        padding: 1.25rem 1.35rem 1rem !important;
      }

      .command-login-shell > div > div > div:last-child > div:last-child {
        padding: 1.1rem 1.35rem 1.35rem !important;
      }

      .command-login-shell button[type="submit"] {
        box-shadow: 0 8px 0 rgba(127,19,36,0.9), 0 18px 28px rgba(127,19,36,0.22) !important;
      }

      @media (max-width: 1023px) {
        .command-login-shell > div > div > div:last-child {
          border-radius: 24px !important;
        }

        .command-login-shell > div > div > div:last-child > div:first-child,
        .command-login-shell > div > div > div:last-child > div:last-child {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }
      }
    `}</style>
  );
}



function getNotificationIdFromUrl(value) {
  if (typeof window === "undefined") return "";
  try {
    const url = value ? new URL(value, window.location.origin) : new URL(window.location.href);
    return url.searchParams.get("notification_id") || url.searchParams.get("notificationId") || "";
  } catch {
    return "";
  }
}

function getIncidentTargetFromUrl(value) {
  if (typeof window === "undefined") return "";

  try {
    const url = value ? new URL(value, window.location.origin) : new URL(window.location.href);
    const match = url.pathname.match(/^\/incident\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);

    return (
      url.searchParams.get("incident_id") ||
      url.searchParams.get("incidentId") ||
      url.searchParams.get("case_id") ||
      url.searchParams.get("caseId") ||
      ""
    );
  } catch {
    return "";
  }
}

function CommandCenterLoginScreen() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#7b0f1d_0%,#4a0c16_16%,#21060c_28%,#140307_40%,#100206_100%)] text-white">
      <EmergencyHeaderStyle />
      <CommandCenterLoginEmbeddedStyle />
      <div className="relative min-h-screen px-4 py-4 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
            style={{ backgroundImage: `url(${bgLogo})`, backgroundSize: "min(72vw, 720px)" }}
          />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#d9b75f]/16 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col">
          <EmergencyHeaderAlertBar />

          <div className="grid flex-1 items-center gap-6 pt-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-10 lg:pt-24">
            <section className="hidden lg:block">
              <div className="relative overflow-hidden rounded-[36px] border border-[#f3d77a]/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,215,122,0.10),transparent_34%)]" />
                <div className="relative flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#ffe3a3]/40 bg-white/10 p-3 shadow-[0_18px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.22)]">
                    <img src={hqLogo} alt="HQ Logo" className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.28)]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#f7dca2]">{HQ_ENG_NAME}</div>
                    <div className="mt-2 text-3xl font-black leading-tight text-white">{HQ_THAI_NAME}</div>
                    <div className="mt-2 max-w-xl text-sm leading-7 text-white/78">
                      14/4 ถนนคชเสนีย์ ตำบลหล่มสัก อำเภอหล่มสัก จังหวัดเพชรบูรณ์ 67110
                    </div>
                  </div>
                </div>

                <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <div className="text-sm font-black text-[#ffe3a3]">ข้อมูลสถิติเคส</div>
                    <div className="mt-1 text-xs leading-6 text-white/76">ภาพรวมสถิติเคสที่ออกปฏิบัติงานของอาสาสมัครหน่วยกู้ภัยกกไทร</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <div className="text-sm font-black text-[#ffe3a3]">บันทึกข้อมูลเคส</div>
                    <div className="mt-1 text-xs leading-6 text-white/76">แบบฟอร์มบันทึกข้อมูลและรายละเอียดเคสที่ออกปฏิบัติงาน</div>
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <div className="text-sm font-black text-[#ffe3a3]">แจ้งเหตุ</div>
                    <div className="mt-1 text-xs leading-6 text-white/76">อาสาสมัครแจ้งเหตุ แจ้งเตือนผ่านแอปพลิเคชันทันที</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top,rgba(255,218,128,0.18),transparent_42%)] blur-2xl" />
              <div className="relative w-full max-w-[560px] rounded-[36px] border border-white/15 bg-white/8 p-3 shadow-[0_28px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-xl sm:p-4">
                <div className="command-login-shell">
                  <Login initialMode="login" embedded />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function RescueAppShell({ session, profile, onLogout }) {
  const cameraInputRef = useRef(null);
  const attachInputRef = useRef(null);

  const [deviceToken, setDeviceToken] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPromptLoading, setNotificationPromptLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const preservedTab = window.sessionStorage.getItem("activeTabAfterReload");
    if (preservedTab) {
      window.sessionStorage.removeItem("activeTabAfterReload");
      return preservedTab;
    }
    return "dashboard";
  });

  const [selectedIncidentId, setSelectedIncidentId] = useState(() => getIncidentTargetFromUrl());
  const [detailIncident, setDetailIncident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [form, setForm] = useState(createInitialForm());
  const [commandDraft, setCommandDraft] = useState({
    ...createAlertDraft(),
    details: "",
    reporterPhone: "",
    status: "open",
  });
  const [submitting, setSubmitting] = useState(false);
  const [commandSaving, setCommandSaving] = useState(false);
  const [dbError, setDbError] = useState("");
  const [submitResult, setSubmitResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [timelineUpdating, setTimelineUpdating] = useState({});
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [reportType, setReportType] = useState("single_case");
  const [editingIncidentId, setEditingIncidentId] = useState(null);
  const [removedStoredImages, setRemovedStoredImages] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [personnel, setPersonnel] = useState([]);
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [personnelError, setPersonnelError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [uiScaleClass, setUiScaleClass] = useState("ui-scale-base");

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const userRole = profile?.role || "user";

  const isAdmin = userRole === "admin";

  const canWrite =
    userRole === "admin" ||
    userRole === "boss" ||
    userRole === "station" ||
    userRole === "volunteer";

  const canUseCommand = canWrite;

  const canViewReports = true;

  const sidebarIconButtonBase =
    "group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-white transition duration-200 hover:-translate-y-0.5 active:translate-y-[2px]";
  const notifyButtonClass = `${sidebarIconButtonBase} border border-[#f0d58a] bg-[linear-gradient(180deg,#d7b85e_0%,#a9791e_100%)] shadow-[0_0_0_1px_rgba(255,215,100,0.45),0_10px_18px_rgba(148,102,21,0.28),0_4px_0_rgba(111,72,10,0.95),inset_0_1px_0_rgba(255,255,255,0.42)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_14px_22px_rgba(148,102,21,0.36),0_4px_0_rgba(111,72,10,0.95),inset_0_1px_0_rgba(255,255,255,0.5)] active:shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_6px_10px_rgba(148,102,21,0.22),0_1px_0_rgba(111,72,10,0.95),inset_0_1px_0_rgba(255,215,100,0.45)]`;
  const logoutButtonClass = `${sidebarIconButtonBase} border border-[#f3b0b8] bg-[linear-gradient(180deg,#ef5b6c_0%,#b91c34_100%)] shadow-[0_0_0_1px_rgba(255,215,100,0.45),0_10px_18px_rgba(185,28,52,0.34),0_4px_0_rgba(125,16,35,0.95),inset_0_1px_0_rgba(255,255,255,0.42)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_14px_22px_rgba(185,28,52,0.42),0_4px_0_rgba(125,16,35,0.95),inset_0_1px_0_rgba(255,255,255,0.5)] active:shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_6px_10px_rgba(185,28,52,0.24),0_1px_0_rgba(125,16,35,0.95),inset_0_1px_0_rgba(255,215,100,0.45)]`;

  const getDeviceToken = async (options = {}) => {
    const silent = Boolean(options.silent);

    const notifyError = (message) => {
      console.warn(message);
      if (!silent) alert(message);
    };

    const persistDeviceToken = async (token) => {
      const normalizedToken = String(token || "").trim();
      if (!normalizedToken) throw new Error("ไม่สามารถรับ device token ได้");

      await saveDeviceTokenForUser(normalizedToken, session.user, profile);
      setDeviceToken(normalizedToken);
      setNotificationEnabled(true);
      localStorage.setItem("fcm_token", normalizedToken);
      localStorage.setItem("noti_enabled", "true");
      return normalizedToken;
    };

    try {
      if (!session?.user?.id) {
        notifyError("กรุณาเข้าสู่ระบบก่อนเปิดแจ้งเตือน");
        return null;
      }

      // Capacitor registers asynchronously. The callback persists the token
      // when the native registration event returns it.
      const nativeResult = await initPushNotifications(persistDeviceToken);
      if (nativeResult?.supported) {
        if (!nativeResult.granted) {
          const reason = nativeResult.error?.message || "คุณยังไม่อนุญาตการแจ้งเตือน";
          notifyError(reason);
          setNotificationEnabled(false);
          localStorage.removeItem("noti_enabled");
          return null;
        }

        if (!silent) {
          alert("เปิดการแจ้งเตือนแล้ว ระบบจะบันทึก device token อัตโนมัติ");
        }
        return true;
      }

      const supported = await isSupported();
      if (!supported) {
        notifyError("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
        return null;
      }

      if (typeof window === "undefined" || !("Notification" in window)) {
        notifyError("อุปกรณ์นี้ไม่รองรับการแจ้งเตือน");
        return null;
      }

      if (!("serviceWorker" in navigator)) {
        notifyError("อุปกรณ์นี้ไม่รองรับ Service Worker สำหรับแจ้งเตือน");
        return null;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        notifyError("ยังไม่ได้ตั้งค่า VITE_FIREBASE_VAPID_KEY ในระบบ");
        return null;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        notifyError("คุณยังไม่อนุญาตการแจ้งเตือน");
        setNotificationEnabled(false);
        localStorage.removeItem("noti_enabled");
        return null;
      }

      if (!firebaseApp) {
        notifyError("ยังไม่ได้ตั้งค่า Firebase สำหรับการแจ้งเตือน");
        return null;
      }

      // Always register the intended Firebase worker. Reusing an arbitrary root
      // Service Worker can produce a valid token whose background handler is absent.
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/", updateViaCache: "none" },
      );
      await registration.update().catch(() => undefined);
      await navigator.serviceWorker.ready;

      const firebaseMessaging = getMessaging(firebaseApp);
      const token = await getToken(firebaseMessaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      const savedToken = await persistDeviceToken(token);
      if (!silent) alert("เปิดแจ้งเตือนสำเร็จ");
      return savedToken;
    } catch (err) {
      console.error("getDeviceToken error:", err);
      setNotificationEnabled(false);
      if (!silent) alert(`เกิดข้อผิดพลาดในการเปิดแจ้งเตือน: ${err.message || err}`);
      return null;
    }
  };

  const appTabs = useMemo(() => {
    const baseTabs = TABS.filter((tab) => {
      if (tab.key === "form") return canWrite;
      if (tab.key === "command") return canUseCommand;
      if (tab.key === "report") return canViewReports;
    return true;
    });

    const tabs = isAdmin
? [
    ...baseTabs,
    {
      key: "users",
      label: "ผู้ใช้",
      icon: Users
    },
    {
      key: "ambulances",
      label: "รถพยาบาล",
      icon: HeartPulse
    },
    {
      key: "admin",
      label: "Admin",
      icon: Settings
    }
  ]
: baseTabs;
    return tabs.map((tab) => (
      tab.key === "notifications"
        ? { ...tab, badge: unreadNotificationCount }
        : tab
    ));
  }, [canUseCommand, canWrite, isAdmin, unreadNotificationCount]);

  const mobileQuickTabs = useMemo(() => {
    const preferredKeys = ["dashboard", "command", "form", "notifications"];
    const preferredTabs = preferredKeys
      .map((key) => appTabs.find((tab) => tab.key === key))
      .filter(Boolean);

    const fallbackTabs = appTabs.filter(
      (tab) => !preferredTabs.some((preferred) => preferred.key === tab.key),
    );

    return [...preferredTabs, ...fallbackTabs].slice(0, 4);
  }, [appTabs]);

  const previewImages = useMemo(
    () =>
      (form.images || []).map((file) => ({
          file,
          url: file instanceof File ? URL.createObjectURL(file) : file.publicUrl || file.url || "",
        }))
        .filter((x) => !!x.url),
    [form.images]
  );

  const currentPosition = useMemo(() => parseGps(form.gps), [form.gps]);

  useEffect(
    () => () => {
      previewImages.forEach((x) => {
        if (x.file instanceof File) URL.revokeObjectURL(x.url);
      });
    },
    [previewImages]
  );

  const openIncidentDetail = (target) => {
    const id = getIncidentTargetFromUrl(target);
    if (!id) return;

    const notificationId = getNotificationIdFromUrl(target);
    if (notificationId && session?.user?.id) {
      markNotificationRead(notificationId, session.user.id)
        .then(async () => {
          const count = await getUnreadNotificationCount(session.user.id);
          setUnreadNotificationCount(count);
        })
        .catch((error) => console.warn("mark push notification read error:", error));
    }

    setSelectedIncidentId(id);
    setMobileSidebarOpen(false);

    if (typeof window !== "undefined") {
      const nextPath = `/incident/${encodeURIComponent(id)}`;
      if (window.location.pathname + window.location.search !== nextPath) {
        window.history.pushState(null, "", nextPath);
      }
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }), 50);
    }
  };

  const closeIncidentDetail = () => {
    setSelectedIncidentId("");
    setDetailIncident(null);
    setDetailError("");

    if (typeof window !== "undefined" && window.location.pathname.startsWith("/incident/")) {
      window.history.pushState(null, "", "/");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromUrl = () => {
      const id = getIncidentTargetFromUrl();
      setSelectedIncidentId(id);
    };

    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === "OPEN_INCIDENT_DETAIL" && event.data?.url) {
        openIncidentDetail(event.data.url);
      }
    };

    window.addEventListener("popstate", syncFromUrl);
    navigator.serviceWorker?.addEventListener?.("message", handleServiceWorkerMessage);
    syncFromUrl();

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      navigator.serviceWorker?.removeEventListener?.("message", handleServiceWorkerMessage);
    };
  }, []);

  const loadIncidentDetail = async (targetId = selectedIncidentId) => {
    if (!targetId) {
      setDetailIncident(null);
      setDetailError("");
      return;
    }

    const localIncident = incidents.find(
      (item) => String(item.id) === String(targetId) || String(item.case_id) === String(targetId)
    );

    if (localIncident) {
      setDetailIncident(localIncident);
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);
    setDetailError("");

    try {
      const normalizedTarget = String(targetId).trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          normalizedTarget,
        );

      const query = supabase.from("incidents").select("*");
      const { data, error } = await (isUuid
        ? query.eq("id", normalizedTarget)
        : query.eq("case_id", normalizedTarget)
      ).maybeSingle();

      if (error) throw error;

      setDetailIncident(data || null);
      setDetailError(data ? "" : "ไม่พบเคสนี้ในฐานข้อมูล");
    } catch (error) {
      console.error("load incident detail error:", error);
      setDetailIncident(null);
      setDetailError(error.message || "โหลดรายละเอียดเคสไม่สำเร็จ");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentDetail(selectedIncidentId);
  }, [selectedIncidentId, incidents]);

  useEffect(() => {
    const notificationId = getNotificationIdFromUrl();
    const userId = session?.user?.id;
    if (!notificationId || !userId) return;

    markNotificationRead(notificationId, userId)
      .then(async () => {
        const count = await getUnreadNotificationCount(userId);
        setUnreadNotificationCount(count);
      })
      .catch((error) => console.warn("mark opened notification read error:", error));
  }, [selectedIncidentId, session?.user?.id]);


  useEffect(() => {
    let cancelled = false;

    const checkSavedDeviceToken = async () => {
      if (typeof window === "undefined") return;

      const savedToken = localStorage.getItem("fcm_token") || "";
      if (savedToken) setDeviceToken(savedToken);

      if (!session?.user?.id) {
        setNotificationEnabled(false);
          return;
      }

      try {
        const data = await getActiveDeviceTokenForUser(session.user.id, savedToken);
        if (cancelled) return;

        if (data?.token) {
          setDeviceToken(data.token);
          setNotificationEnabled(true);
          localStorage.setItem("fcm_token", data.token);
          localStorage.setItem("noti_enabled", "true");
          setShowNotificationPrompt(false);
        } else {
          setDeviceToken(savedToken);
          setNotificationEnabled(false);
          localStorage.removeItem("noti_enabled");
          const dismissedForSession =
            window.sessionStorage.getItem("notification_prompt_dismissed") === "true";
          setShowNotificationPrompt(!dismissedForSession);
        } 
      } catch (err) {
        console.error("check device token error:", err);
      }
    };

    checkSavedDeviceToken();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const allowNotificationsFromPrompt = async () => {
    if (notificationPromptLoading) return;
    setNotificationPromptLoading(true);
    try {
      const saved = await getDeviceToken();
      if (saved) setShowNotificationPrompt(false);
    } finally {
      setNotificationPromptLoading(false);
    }
  };

  const dismissNotificationPrompt = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("notification_prompt_dismissed", "true");
    }
    setShowNotificationPrompt(false);
  };


  useEffect(() => {
    if (!session?.user?.id || typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const previouslyEnabled = localStorage.getItem("noti_enabled") === "true";
    if (previouslyEnabled && Notification.permission === "granted") {
      getDeviceToken({ silent: true });
    }
  }, [session?.user?.id]);

  useEffect(() => {
  let unsubscribe = null;

  const setupForegroundMessaging = async () => {
    try {
      const supported = await isSupported();
      if (!supported) return;

      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (!firebaseApp) return;

      const messaging = getMessaging(firebaseApp);

      unsubscribe = onMessage(messaging, async (payload) => {
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          "แจ้งเตือนกู้ภัยกกไทร";

        const body =
          payload.notification?.body ||
          payload.data?.body ||
          payload.data?.message ||
          "มีรายการแจ้งเหตุใหม่";

        const notificationData = payload?.data || {};
        const incidentId =
          notificationData.incident_id ||
          notificationData.incidentId ||
          notificationData.id ||
          "";

        const caseId =
          notificationData.case_id ||
          notificationData.caseId ||
          "";

        const notificationUrl =
          notificationData.url ||
          (incidentId
            ? `/incident/${incidentId}`
            : caseId
            ? `/incident/${caseId}`
            : "/");

        const options = {
          body,
          icon: "/notification-icon.png",
          badge: "/notification-badge.png",
          image: "/notification-icon.png",
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: {
            ...notificationData,
            url: notificationUrl,
            incident_id: incidentId,
            case_id: caseId,
          },
        };

        if (Notification.permission !== "granted") {
          console.warn("Notification permission not granted");
          return;
        }

        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
        } catch (error) {
          console.warn("foreground showNotification error:", error);

          try {
            new Notification(title, options);
          } catch (fallbackError) {
            console.warn("foreground Notification error:", fallbackError);
          }
        }

      });
    } catch (error) {
      console.error("foreground messaging setup error:", error);
    }
  };

  setupForegroundMessaging();

  return () => {
    if (typeof unsubscribe === "function") unsubscribe();
  };
}, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setUnreadNotificationCount(0);
      return undefined;
    }

    let cancelled = false;
    const refreshUnread = async () => {
      try {
        const count = await getUnreadNotificationCount(userId);
        if (!cancelled) setUnreadNotificationCount(count);
      } catch (error) {
        console.error("load unread notification count error:", error);
      }
    };

    refreshUnread();
    const channel = supabase
      .channel(`notification-count-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        refreshUnread,
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!mobileSidebarOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyResponsiveScale = () => {
      const width = window.innerWidth;
      const dpr = window.devicePixelRatio || 1;

      if (width <= 360) {
        setUiScaleClass("ui-scale-xs");
        return;
      }
      if (width <= 640) {
        setUiScaleClass(dpr >= 2 ? "ui-scale-sm" : "ui-scale-base");
        return;
      }
      if (width <= 1024) {
        setUiScaleClass("ui-scale-base");
        return;
      }
      if (width >= 1600 || dpr >= 1.5) {
        setUiScaleClass("ui-scale-lg");
        return;
      }
      setUiScaleClass("ui-scale-base");
    };

    applyResponsiveScale();
    window.addEventListener("resize", applyResponsiveScale);
    return () => window.removeEventListener("resize", applyResponsiveScale);
  }, []);


  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();

    const dismissed = localStorage.getItem("install_banner_dismissed");
    if (dismissed === "true") return;

    setDeferredPrompt(e);
    setShowInstallBanner(true);
   };

    const handleAppInstalled = () => {
      localStorage.setItem("install_banner_dismissed", "true");
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const loginUsername =
      profile?.username ||
      session?.user?.user_metadata?.username ||
      session?.user?.email ||
      "";

    if (!loginUsername) return;

    setForm((prev) => ({
      ...prev,
      reporterName: loginUsername,
    }));
  }, [profile?.username, session?.user?.email, session?.user?.user_metadata?.username]);

  const assignNextCaseId = async () => {
    try {
      const nextCaseId = await getNextCaseIdFromDb(getCurrentDate());
      setForm((prev) => ({ ...prev, caseId: nextCaseId }));
      setCommandDraft((prev) => ({ ...prev, caseId: nextCaseId }));
    } catch (error) {
      setDbError(error.message || "สร้างเลขเคสอัตโนมัติไม่สำเร็จ");
    }
  };

  const resetFormWithNextCaseId = async () => {
    const baseForm = createInitialForm();
    const baseCommand = { ...createAlertDraft(), details: "", reporterPhone: "", status: "open" };

    const loginUsername =
      profile?.username ||
      session?.user?.user_metadata?.username ||
      session?.user?.email ||
      "";

    setForm({
      ...baseForm,
      reporterName: loginUsername,
    });
    setCommandDraft(baseCommand);
    setRemovedStoredImages([]);
    setEditingIncidentId(null);

    try {
      const nextCaseId = await getNextCaseIdFromDb(baseForm.caseDate);
      setForm((prev) => ({ ...prev, caseId: nextCaseId }));
      setCommandDraft((prev) => ({ ...prev, caseId: nextCaseId }));
    } catch (error) {
      setDbError(error.message || "สร้างเลขเคสอัตโนมัติไม่สำเร็จ");
    }
  };

  const reloadIncidents = async () => {
    setDbError("");
    try {
      const rows = await loadIncidentsFromDb();
      setIncidents(rows);
      setSelectedReportIds((prev) => prev.filter((id) => rows.some((row) => row.id === id)));
    } catch (error) {
      setDbError(error.message || "โหลดฐานข้อมูลไม่สำเร็จ");
    }
  };

  const mapPersonnelCardRow = (row) => {
    const profile = row?.profile || row?.profiles || {};

    return {
      id: row.id,
      card_id: row.id,
      profile_id: row.profile_id,
      user_id: row.profile_id,
      username: profile.username || "",
      full_name: row.display_name || row.full_name || profile.full_name || profile.username || profile.email || "",
      phone: row.phone || profile.phone || "",
      email: row.email || profile.email || "",
      role: profile.role || "volunteer",
      created_at: row.created_at || profile.created_at,
      is_volunteer: profile.is_volunteer ?? true,
      rescue_station: row.rescue_station || profile.rescue_station || "",
      is_active: row.is_active ?? profile.is_active ?? true,
      personnel_position: row.personnel_position || "volunteer",
      position_title: row.position_title || "",
      personnel_sort_order: row.personnel_sort_order ?? 9999,
      profile_photo_url: row.profile_photo_url || "",
      avatar_url: row.avatar_url || "",
      nickname: row.nickname || "",
      callsign: row.callsign || "",
      facebook_url: row.facebook_url || "",
      line_url: row.line_url || "",
      tiktok_url: row.tiktok_url || "",
      instagram_url: row.instagram_url || "",
      youtube_url: row.youtube_url || "",
      website_url: row.website_url || "",
      social_links: row.social_links || {},
    };
  };

  const mapLegacyPersonnelRow = (row) => ({
    id: row.id,
    full_name: row.name || row.full_name || row.display_name || "",
    phone: row.phone || "",
    email: row.email || "",
    role: row.role || "volunteer",
    created_at: row.created_at,
    is_volunteer: row.is_volunteer ?? true,
    rescue_station: row.branch || row.rescue_station || row.section || "",
    branch: row.branch || row.rescue_station || row.section || "",
    section: row.section || "",
    is_active: row.is_active ?? true,
    personnel_position: row.position || row.personnel_position || "volunteer",
    position_title: row.group_name || row.position_title || row.position || "",
    group_name: row.group_name || row.position_title || row.position || "",
    personnel_sort_order: row.display_order ?? row.personnel_sort_order ?? 9999,
    display_order: row.display_order ?? row.personnel_sort_order ?? 9999,
    profile_photo_url: row.photo_url || row.profile_photo_url || "",
    photo_url: row.photo_url || row.profile_photo_url || "",
    avatar_url: row.avatar_url || "",
    nickname: row.nickname || "",
    callsign: row.call_sign || row.callsign || "",
    call_sign: row.call_sign || row.callsign || "",
    facebook_url: row.facebook || row.facebook_url || "",
    facebook: row.facebook || row.facebook_url || "",
    line_url: row.line || row.line_url || "",
    line: row.line || row.line_url || "",
    tiktok_url: row.tiktok || row.tiktok_url || "",
    tiktok: row.tiktok || row.tiktok_url || "",
    instagram_url: row.instagram || row.instagram_url || "",
    youtube_url: row.youtube || row.youtube_url || "",
    website_url: row.website || row.website_url || "",
    social_links: row.social_links || {},
  });

  const reloadPersonnel = async () => {
    setPersonnelLoading(true);
    setPersonnelError("");

    const selectPersonnelCardColumns = `
      id,
      profile_id,
      display_name,
      full_name,
      phone,
      email,
      rescue_station,
      is_active,
      personnel_position,
      position_title,
      personnel_sort_order,
      profile_photo_url,
      avatar_url,
      nickname,
      callsign,
      facebook_url,
      line_url,
      tiktok_url,
      instagram_url,
      youtube_url,
      website_url,
      social_links,
      created_at,
      updated_at,
      profile:profiles (
        id,
        username,
        full_name,
        phone,
        email,
        role,
        created_at,
        is_volunteer,
        rescue_station,
        is_active
      )
    `;
    const selectProfileCardColumns =
      "id, username, full_name, phone, email, role, created_at, is_volunteer, rescue_station, is_active, personnel_position, position_title, personnel_sort_order, profile_photo_url, avatar_url, nickname, callsign, facebook_url, line_url, tiktok_url, instagram_url, youtube_url, website_url, social_links";
    const selectOrgColumns =
      "id, username, full_name, phone, email, role, created_at, is_volunteer, rescue_station, is_active, personnel_position, position_title, personnel_sort_order";
    const selectBaseColumns = "id, username, full_name, phone, email, role, created_at";

    try {
      const cardResult = await supabase
        .from("personnel_cards")
        .select(selectPersonnelCardColumns)
        .order("personnel_sort_order", { ascending: true, nullsFirst: false })
        .order("display_name", { ascending: true, nullsFirst: false });

      if (!cardResult.error && cardResult.data?.length) {
        setPersonnel(cardResult.data.map(mapPersonnelCardRow).filter((person) => person.is_active !== false));
        return;
      }

      if (cardResult.error) {
        console.warn("personnel_cards unavailable, trying legacy personnel table:", cardResult.error.message);
      }

      const legacyResult = await supabase
        .from("personnel")
        .select("*")
        .order("display_order", { ascending: true, nullsFirst: false });

      if (!legacyResult.error && legacyResult.data?.length) {
        setPersonnel(legacyResult.data.map(mapLegacyPersonnelRow).filter((person) => person.is_active !== false));
        return;
      }

      if (legacyResult.error) {
        console.warn("legacy personnel table unavailable, falling back to profiles:", legacyResult.error.message);
      }

      let { data, error } = await supabase
        .from("profiles")
        .select(selectProfileCardColumns)
        .order("full_name", { ascending: true, nullsFirst: false });

      if (error) {
        const orgFallback = await supabase
          .from("profiles")
          .select(selectOrgColumns)
          .order("full_name", { ascending: true, nullsFirst: false });

        data = orgFallback.data;
        error = orgFallback.error;
      }

      if (error) {
        const baseFallback = await supabase
          .from("profiles")
          .select(selectBaseColumns)
          .order("full_name", { ascending: true, nullsFirst: false });

        data = baseFallback.data;
        error = baseFallback.error;
      }

      if (error) throw error;

      setPersonnel((data || []).filter(isRescuePersonnel));
    } catch (error) {
      console.error("load personnel error:", error);
      setPersonnel([]);
      setPersonnelError(error.message || "โหลดทำเนียบบุคลากรไม่สำเร็จ");
    } finally {
      setPersonnelLoading(false);
    }
  };

  useEffect(() => {
    reloadIncidents();
    reloadPersonnel();
    assignNextCaseId();
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("incidentFormScrollTopAfterReload") === "1"
    ) {
      window.sessionStorage.removeItem("incidentFormScrollTopAfterReload");
      window.setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!appTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(appTabs[0]?.key || "dashboard");
    }
  }, [activeTab, appTabs]);

  const reloadUsers = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, phone, email, role, is_volunteer, is_active, rescue_station, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert(error.message || "โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) reloadUsers();
    else setUsers([]);
  }, [isAdmin]);

  const changeUserRole = async (userId, nextRole, displayName) => {
    if (!isAdmin) return;
    const ok = window.confirm(
      `ต้องการเปลี่ยนสิทธิ์ของ ${displayName} เป็น ${getRoleLabel(nextRole)} ใช่หรือไม่?`
    );
    if (!ok) return;

    setUsersLoading(true);
    try {
      const roleUpdate = nextRole === "user"
        ? { role: nextRole, is_active: false, approved_at: null, approved_by: null }
        : { role: nextRole };
      const { error } = await supabase.from("profiles").update(roleUpdate).eq("id", userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...roleUpdate } : user))
      );
      await reloadPersonnel();
      alert("อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว");
    } catch (error) {
      alert(error.message || "อัปเดตสิทธิ์ผู้ใช้ไม่สำเร็จ");
      await reloadUsers();
    } finally {
      setUsersLoading(false);
    }
  };

  const changeUserStation = async (userId, nextStation, displayName) => {
    if (!isAdmin || userId === session?.user?.id) return;
    const ok = window.confirm(`ต้องการเปลี่ยนพื้นที่ของ ${displayName} เป็น ${nextStation === "all" ? "ทุกพื้นที่" : nextStation} ใช่หรือไม่?`);
    if (!ok) return;

    setUsersLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ rescue_station: nextStation })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, rescue_station: nextStation } : user,
        ),
      );
      alert("อัปเดตพื้นที่ผู้ใช้เรียบร้อยแล้ว");
    } catch (error) {
      alert(error.message || "อัปเดตพื้นที่ผู้ใช้ไม่สำเร็จ");
      await reloadUsers();
    } finally {
      setUsersLoading(false);
    }
  };

  const changeUserStatus = async (userId, nextActive, displayName) => {
    if (!isAdmin || userId === session?.user?.id) return;

    const targetUser = users.find((user) => user.id === userId);
    if (nextActive && (!targetUser || targetUser.role === "user")) {
      alert("กรุณาเลือกสิทธิ์ผู้ใช้ก่อนอนุมัติบัญชี");
      return;
    }

    const actionLabel = nextActive ? "อนุมัติและเปิดใช้งาน" : "ปิดการใช้งาน";
    const ok = window.confirm(`ต้องการ${actionLabel}บัญชีของ ${displayName} ใช่หรือไม่?`);
    if (!ok) return;

    setUsersLoading(true);
    try {
      const updatePayload = {
        is_active: nextActive,
        approved_at: nextActive ? new Date().toISOString() : null,
        approved_by: nextActive ? session?.user?.id : null,
      };
      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...updatePayload } : user)),
      );
      alert(nextActive ? "อนุมัติบัญชีเรียบร้อยแล้ว" : "ปิดการใช้งานบัญชีเรียบร้อยแล้ว");
    } catch (error) {
      alert(error.message || "อัปเดตสถานะบัญชีไม่สำเร็จ");
      await reloadUsers();
    } finally {
      setUsersLoading(false);
    }
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateVehicle = (index, key, value) =>
    setForm((prev) => {
      const next = [...prev.vehicles];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, vehicles: next };
    });

  const updatePatient = (index, key, value) =>
    setForm((prev) => {
      const next = [...prev.patients];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, patients: next };
    });

  const addVehicle = () =>
    setForm((prev) => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        { type: "", brand: "", model: "", color: "", plate: "", province: "" },
      ],
    }));

  const addPatient = () =>
    setForm((prev) => ({
      ...prev,
      patients: [
        ...prev.patients,
        {
          status: "",
          gender: "",
          prefix: "",
          fullName: "",
          age: "",
          symptoms: "",
          aidFirstAid: false,
          aidOxygen: false,
          aidTransfer: false,
        },
      ],
    }));

  const removeVehicle = (index) =>
    setForm((prev) => ({
      ...prev,
      vehicles:
        prev.vehicles.length > 1
          ? prev.vehicles.filter((_, i) => i !== index)
          : [{ type: "", brand: "", model: "", color: "", plate: "", province: "" }],
    }));

  const removePatient = (index) =>
    setForm((prev) => ({
      ...prev,
      patients:
        prev.patients.length > 1
          ? prev.patients.filter((_, i) => i !== index)
          : [
              {
                status: "",
                gender: "",
                prefix: "",
                fullName: "",
                age: "",
                symptoms: "",
                aidFirstAid: false,
                aidOxygen: false,
                aidTransfer: false,
              },
            ],
    }));

  const handleFiles = (files) => {
    const accepted = [];
    const rejected = [];

    for (const file of Array.from(files || [])) {
      if (!file?.type?.startsWith("image/")) {
        rejected.push(`${file?.name || "ไฟล์"}: ต้องเป็นรูปภาพ`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        rejected.push(`${file.name}: ขนาดเกิน 10 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) {
      alert(`ไม่สามารถเพิ่มบางไฟล์ได้\n${rejected.join("\n")}`);
    }

    if (!accepted.length) return;

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...accepted],
    }));
  };

  const removeImage = (index) =>
    setForm((prev) => {
      const removed = prev.images[index];
      if (removed && !(removed instanceof File) && removed.path) {
        setRemovedStoredImages((list) => [...list, removed]);
      }
      return { ...prev, images: prev.images.filter((_, i) => i !== index) };
    });

  const normalizeCoordinate = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const extractCoordinates = (lat, lng) => {
    const normalizePair = (rawLat, rawLng) => {
      const latNum = normalizeCoordinate(rawLat);
      const lngNum = normalizeCoordinate(rawLng);
      const valid =
        latNum !== null &&
        lngNum !== null &&
        latNum >= -90 &&
        latNum <= 90 &&
        lngNum >= -180 &&
        lngNum <= 180;

      return valid ? { latNum, lngNum } : { latNum: null, lngNum: null };
    };

    if (typeof lat === "object" && lat !== null) {
      return normalizePair(lat.lat ?? lat.latitude, lat.lng ?? lat.longitude);
    }

    return normalizePair(lat, lng);
  };

  const getGPS = (setter) => {
    if (!navigator.geolocation) {
      alert("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await setter(pos.coords.latitude, pos.coords.longitude);
      },
      () => alert("ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาตตำแหน่งบนมือถือ"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const applyGpsLocation = (stateSetter, source, lat, lng) => {
    const { latNum, lngNum } = extractCoordinates(lat, lng);

    if (latNum === null || lngNum === null) {
      console.error(`${source} invalid coords:`, { lat, lng });
      alert("พิกัดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      return null;
    }

    const gps = `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
    stateSetter((prev) => ({ ...prev, gps }));
    return gps;
  };

  const updateMapLocation = (lat, lng) =>
    applyGpsLocation(setForm, "updateMapLocation", lat, lng);

  const updateCommandLocation = (lat, lng) =>
    applyGpsLocation(setCommandDraft, "updateCommandLocation", lat, lng);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite || submitting) return;

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const wasEditing = !!editingIncidentId;
      const row = wasEditing
        ? await updateIncidentInDb(editingIncidentId, form, removedStoredImages)
        : await createIncidentInDb(form);

      await reloadIncidents();
      setRemovedStoredImages([]);
      setEditingIncidentId(null);

      const deliveryWarnings = [];

      if (!wasEditing) {
        try {
          await sendCommandPushNotification({
            title: `แจ้งเหตุใหม่ ${row.case_id || ""}`.trim(),
            body: buildAlertMessage(incidentRowToForm(row)),
            targetStation: "all",
            data: {
              incident_id: row.id || "",
              incidentId: row.id || "",
              caseId: row.case_id || "",
              caseType: row.case_type || "",
              place: row.place || row.location_text || "",
              tambon: row.tambon || "",
              gps: row.gps_text || "",
              targetStation: "all",
              rescueStation: "all",
              url: row.id ? `/incident/${row.id}` : "/",
            },
          });
        } catch (error) {
          console.error("push after incident form save error:", error);
          deliveryWarnings.push(`Push: ${error.message || "ส่งไม่สำเร็จ"}`);
        }

      }

      const successMessage = wasEditing
        ? `แก้ไขข้อมูลสำเร็จ เลขที่เคส: ${row.case_id || "-"}`
        : `บันทึกข้อมูลสำเร็จ เลขที่เคส: ${row.case_id || "-"}`;
      window.alert(
        deliveryWarnings.length
          ? `${successMessage}\n\nแต่มีปัญหาการส่งแจ้งเตือน:\n${deliveryWarnings.join("\n")}`
          : successMessage,
      );

      await resetFormWithNextCaseId();

      setSubmitResult({
        ok: true,
        message: deliveryWarnings.length
          ? `บันทึกสำเร็จ แต่ ${deliveryWarnings.join(" • ")}`
          : wasEditing
            ? "แก้ไขข้อมูลสำเร็จ"
            : "บันทึกข้อมูลและส่งแจ้งเตือนสำเร็จ",
      });
    } catch (error) {
      setSubmitResult({ ok: false, message: error.message || "บันทึกข้อมูลไม่สำเร็จ" });
    } finally {
      setSubmitting(false);
    }
  };

  const sendCommandPushNotification = async (payload = {}) => {
    const targetStation =
      payload?.data?.targetStation ||
      payload?.data?.rescueStation ||
      payload?.targetStation ||
      payload?.rescueStation ||
      commandDraft.rescueStation ||
      commandDraft.targetStation ||
      "all";

    const title = payload.title || `แจ้งเหตุใหม่ ${commandDraft.caseId || ""}`.trim();
    const body = payload.body || commandMessage || "แจ้งเหตุจากศูนย์สั่งการกู้ภัยกกไทร";

    const { data, error } = await supabase.functions.invoke("send-alert", {
      body: {
        title,
        body,
        targetStation,
        rescueStation: targetStation,
        data: {
          ...(payload.data || {}),
          targetStation,
          rescueStation: targetStation,
          incident_id: payload?.data?.incident_id || payload?.data?.incidentId || "",
          incidentId: payload?.data?.incident_id || payload?.data?.incidentId || "",
          caseId: payload?.data?.caseId || commandDraft.caseId || "",
          caseType: payload?.data?.caseType || commandDraft.caseType || "",
          place: payload?.data?.place || commandDraft.place || "",
          tambon: payload?.data?.tambon || commandDraft.tambon || "",
          gps: payload?.data?.gps || commandDraft.gps || "",
          url:
            payload?.data?.url ||
            (payload?.data?.incident_id || payload?.data?.incidentId
              ? `/incident/${payload?.data?.incident_id || payload?.data?.incidentId}`
              : payload?.data?.caseId || commandDraft.caseId
                ? `/incident/${payload?.data?.caseId || commandDraft.caseId}`
                : "/"),
        },
      },
    });

    if (error) throw new Error(error.message || "เรียก send-alert ไม่สำเร็จ");
    if (data?.ok === false || data?.error) {
      throw new Error(data?.error || "ส่งแจ้งเตือนไม่สำเร็จ");
    }
    if (data?.pushError) {
      throw new Error(`FCM: ${data.pushError}`);
    }
    if (Number(data?.sent || 0) < 1) {
      const firstDeliveryError = data?.deliveryErrors?.[0]?.error;
      throw new Error(firstDeliveryError || data?.message || "ไม่มีอุปกรณ์ที่เปิดรับ Push notification");
    }
    if (Number(data?.failed || 0) > 0) {
      throw new Error(data?.message || "ส่ง Push ได้เพียงบางอุปกรณ์");
    }

    return data;
  };

  const saveCommandDraftAsIncident = async (options = {}) => {
    if (!canUseCommand) {
      alert("บัญชีนี้ไม่มีสิทธิ์ใช้งานศูนย์สั่งการ");
      return { ok: false, error: "ไม่มีสิทธิ์ใช้งานศูนย์สั่งการ" };
    }

    setCommandSaving(true);

    try {
      const targetStation =
        options.targetStation ||
        options.rescueStation ||
        commandDraft.rescueStation ||
        "all";

      const payload = {
        ...commandDraft,
        rescueStation: targetStation,
        targetStation,
        accidentDetails: commandDraft.details || commandDraft.accidentDetails || "",
        reporterPhone: commandDraft.reporterPhone || "",
      };

      const row = await createQuickIncidentInDb(payload, "ศูนย์สั่งการ");
      await reloadIncidents();

      let pushWarning = "";
      try {
        await sendCommandPushNotification({
          title: options.notificationTitle || `แจ้งเหตุใหม่ ${row.case_id || ""}`.trim(),
          body: options.notificationBody || commandMessage,
          data: {
            incident_id: row.id || "",
            incidentId: row.id || "",
            caseId: row.case_id || "",
            caseType: row.case_type || commandDraft.caseType || "",
            targetStation,
            rescueStation: targetStation,
            place: commandDraft.place || "",
            tambon: commandDraft.tambon || "",
            gps: commandDraft.gps || "",
            url: row.id ? `/incident/${row.id}` : "/",
          },
        });
      } catch (error) {
        console.error("push after save error:", error);
        pushWarning = error?.message || "ส่ง Push notification ไม่สำเร็จ";
      }

      let nextCaseId = "";
      try {
        nextCaseId = await getNextCaseIdFromDb(getCurrentDate());
      } catch (error) {
        console.error("prepare next command case id error:", error);
        setDbError(error?.message || "สร้างเลขเคสถัดไปไม่สำเร็จ");
      }

      setCommandDraft({
        ...createAlertDraft(),
        caseId: nextCaseId,
        caseDate: getCurrentDate(),
        caseTime: getCurrentTime(),
        details: "",
        reporterPhone: "",
        rescueStation: "all",
        targetStation: "all",
        status: "open",
      });

      const savedMessage = `บันทึกแจ้งเหตุสำเร็จ เลขที่เคส: ${row.case_id || "-"}`;
      window.alert(
        pushWarning
          ? `${savedMessage}\n\nแต่ส่งแจ้งเตือนไม่สำเร็จ: ${pushWarning}`
          : `${savedMessage}\nส่ง Push notification สำเร็จ`,
      );

      return { ok: true, row, pushWarning };
    } catch (error) {
      const message = error?.message || "บันทึกแจ้งเหตุไม่สำเร็จ";
      alert(message);
      return { ok: false, error: message };
    } finally {
      setCommandSaving(false);
    }
  };


  const editIncident = (incident) => {
    if (!canWrite) {
      alert("บัญชีนี้เป็นสิทธิ์ดูอย่างเดียว ไม่สามารถแก้ไขข้อมูลได้");
      return;
    }

    setForm(incidentRowToForm(incident));
    setEditingIncidentId(incident.id);
    setRemovedStoredImages([]);
    setSubmitResult(null);
    setActiveTab("form");
  };

  const cancelEditing = async () => {
    setRemovedStoredImages([]);
    setEditingIncidentId(null);
    setSubmitResult(null);
    await resetFormWithNextCaseId();
  };



 const recordTimelineEventFromApp = async (incident, eventType, label = "ขั้นตอนนี้") => {
    if (!canWrite || !incident?.id || !eventType) return;

    const ok = window.confirm(
      `ยืนยันบันทึกเวลา “${label}” ของเคส ${incident.case_id || "-"} เป็นเวลาปัจจุบันใช่หรือไม่?`,
    );
    if (!ok) return;

    setTimelineUpdating((prev) => ({ ...prev, [incident.id]: eventType }));
    try {
      const updated = await recordIncidentTimelineEvent(
  incident.id,
  eventType,
  new Date().toISOString(),
  label,
  session?.user?.id || null
);

      setIncidents((prev) => prev.map((item) => item.id === incident.id ? { ...item, ...updated } : item));
      setDetailIncident((prev) => prev?.id === incident.id ? { ...prev, ...updated } : prev);

      // ส่งข้อความอัตโนมัติเข้าห้องแชทประจำเคส
      const senderName =
        profile?.username ||
        session?.user?.email ||
        "เจ้าหน้าที่";

      await supabase.from("case_messages").insert({
        incident_id: incident.id,
        sender_id: session?.user?.id || null,
        sender_name: senderName,
        message_text: label,
      });

    } catch (error) {
      console.error("record incident timeline error:", error);
      window.alert(error.message || `บันทึกเวลา ${label} ไม่สำเร็จ`);
    } finally {
      setTimelineUpdating((prev) => {
        const next = { ...prev };
        delete next[incident.id];
        return next;
      });
    }
  };

  const cancelIncidentFromCommand = async (incident) => {
    if (!isAdmin) {
      alert("เฉพาะ admin เท่านั้นที่สามารถยกเลิกเคสได้");
      return;
    }
    try {
      await deleteIncidentFromDb(incident);
      await reloadIncidents();
    } catch (error) {
      alert(error.message || "ยกเลิกเคสไม่สำเร็จ");
    }
  };



  const commandMessage = useMemo(() => buildCommandCenterMessage(commandDraft), [commandDraft]);


  const copyAlert = async () => {
    try {
      await navigator.clipboard.writeText(commandMessage);
      setCopied(true);
    } catch {
      alert("คัดลอกไม่สำเร็จ");
    }
  };

  const loadIncidentIntoCommand = (incident) => {
    setCommandDraft({
      caseId: incident.case_id || "",
      caseDate: incident.incident_date || getCurrentDate(),
      caseTime: String(incident.incident_time || getCurrentTime()).slice(0, 5),
      caseType: incident.case_type || "",
      place: incident.place || incident.location_text || "",
      tambon: incident.tambon || "",
      details: incident.accident_details || incident.details || "",
      reporterPhone: incident.reporter_phone || incident.reporterPhone || "",
      status: incident.status || "open",
      gps:
        incident.gps_text ||
        (incident.gps_lat != null && incident.gps_lng != null ? `${incident.gps_lat}, ${incident.gps_lng}` : ""),
    });
    setActiveTab("command");
  };

  const dashboardStats = useMemo(() => {
  const injured = incidents.reduce(
    (sum, x) =>
      sum +
      (Array.isArray(x.patients_json)
        ? x.patients_json.filter((p) => p.status === "บาดเจ็บ").length
        : 0),
    0
  );

  const emergencyPatients = incidents.reduce(
    (sum, x) =>
      sum +
      (Array.isArray(x.patients_json)
        ? x.patients_json.filter((p) => p.status === "ป่วยฉุกเฉิน").length
        : 0),
    0
  );

  const deceased = incidents.reduce(
    (sum, x) =>
      sum +
      (Array.isArray(x.patients_json)
        ? x.patients_json.filter((p) => p.status === "เสียชีวิต").length
        : 0),
    0
  );

  return {
    accident: incidents.filter((x) => x.case_type === "accident").length,
    emergency: incidents.filter((x) => x.case_type === "emergency").length,
    injured,
    emergencyPatients,
    injuredAndEmergencyTotal: injured + emergencyPatients,
    deceased,
  };
}, [incidents]);

  const reportRows = useMemo(
    () => incidents.filter((x) => selectedReportIds.includes(x.id)),
    [incidents, selectedReportIds]
  );

  const printPdf = () => window.print();

  const handleLogout = async () => {
    const ok = window.confirm("ยืนยันออกจากระบบ?");
    if (!ok) return;

    try {
      setMobileSidebarOpen(false);

      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
        window.localStorage.removeItem("noti_enabled");
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      if (typeof onLogout === "function") {
        onLogout();
        return;
      }

      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    } catch (err) {
      console.error("LOGOUT ERROR:", err);

      if (typeof onLogout === "function") {
        onLogout();
        return;
      }

      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    }
  };


  const dismissInstallBanner = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("install_banner_dismissed", "true");
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      if (typeof window !== "undefined") {
        localStorage.setItem("install_banner_dismissed", "true");
      }
    } catch (error) {
      console.error("install app error:", error);
    } finally {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const renderNavButton = ({ key, label, icon: Icon, badge = 0 }) => {
    const active = activeTab === key;

    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          closeIncidentDetail();
          setActiveTab(key);
        }}
        title={label}
        aria-label={label}
        className={`group relative flex min-h-[48px] w-full items-center gap-3 overflow-hidden rounded-[14px] border px-3 transition-all duration-200 ${
          active
            ? "border-[#f6c85f]/70 bg-gradient-to-r from-[#b91c3b] to-[#7f1324] text-white shadow-[0_12px_26px_rgba(127,19,36,0.30)]"
            : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#b91c3b]/30 hover:bg-rose-50 hover:text-[#7f1324]"
        }`}
      >
        <span className={`pointer-events-none absolute inset-0 opacity-40 transition duration-300 ${
          active
            ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.38),transparent_34%),radial-gradient(circle_at_center,rgba(255,217,121,0.15),transparent_54%),radial-gradient(circle_at_bottom,rgba(255,216,128,0.18),transparent_40%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,transparent,rgba(214,193,150,0.08))] group-hover:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98),transparent_34%),radial-gradient(circle_at_bottom,rgba(212,168,74,0.16),transparent_44%)]"
        }`} />
        {active ? (
          <span className="pointer-events-none absolute inset-[-1px] rounded-[22px] border border-[#ffe08f]/40 shadow-[0_0_16px_rgba(255,214,102,0.24)]" />
        ) : null}
        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
          active
            ? "border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
            : "border-[#ead9ae] bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] group-hover:border-[#d8b564] group-hover:bg-white"
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="relative min-w-0 flex-1 truncate text-left text-[12px] sm:text-[13px] lg:text-sm font-extrabold tracking-[0.01em]">{label}</span>
        {badge > 0 ? (
          <span className="relative flex min-w-6 items-center justify-center rounded-full bg-[#ffd978] px-1.5 py-1 text-[10px] font-black text-[#7f1324] shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    );
  };

  const renderSidebarBottomActions = () => (
  <div className="flex items-center justify-center gap-3 pt-1">
    <button
      type="button"
      onClick={getDeviceToken}
      title={notificationEnabled ? "แจ้งเตือนเปิดอยู่" : "เปิดแจ้งเตือน"}
      aria-label={notificationEnabled ? "แจ้งเตือนเปิดอยู่" : "เปิดแจ้งเตือน"}
      aria-pressed={notificationEnabled}
      className={notifyButtonClass}
    >
      <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_55%)]" />
      <Bell className="relative h-5 w-5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)]" />
      <span className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${notificationEnabled ? "bg-emerald-400" : "bg-amber-300"}`} />
    </button>

    <button
      type="button"
      onClick={handleLogout}
      title="ออกจากระบบ"
      aria-label="ออกจากระบบ"
      className={logoutButtonClass}
    >
      <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_55%)]" />
      <LogOut className="relative h-5 w-5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.22)]" />
    </button>
  </div>
);



  return (
    <div className={`app-shell-zoom rescue-ops-shell ${uiScaleClass} min-h-screen px-2 py-2 pb-28 text-[14px] text-slate-900 sm:px-4 sm:py-4 sm:pb-24 sm:text-[15px] lg:text-[15px]`}>
      {showNotificationPrompt ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="notification-permission-title">
          <div className="w-full max-w-md rounded-[28px] border border-[#f3d77a]/50 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#7f1324] text-white shadow-lg">
              <Bell className="h-8 w-8" />
            </div>
            <h2 id="notification-permission-title" className="mt-5 text-xl font-black text-[#7f1324]">
              เปิดรับการแจ้งเตือน
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              อนุญาตให้ระบบแจ้งงานใหม่และข้อมูลสำคัญจากศูนย์สั่งการบนอุปกรณ์นี้
            </p>
            <button
              type="button"
              onClick={allowNotificationsFromPrompt}
              disabled={notificationPromptLoading}
              className="mt-6 w-full rounded-2xl bg-[#7f1324] px-5 py-3.5 font-black text-white shadow-lg disabled:cursor-wait disabled:opacity-60"
            >
              {notificationPromptLoading ? "กำลังเปิดการแจ้งเตือน..." : "อนุญาตการแจ้งเตือน"}
            </button>
            <button
              type="button"
              onClick={dismissNotificationPrompt}
              disabled={notificationPromptLoading}
              className="mt-2 w-full rounded-2xl px-5 py-3 text-sm font-bold text-slate-500 disabled:opacity-60"
            >
              ไว้ภายหลัง
            </button>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-7xl">
        <div className="rescue-mobile-toolbar sticky top-2 z-[940] mb-3 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-[#65101d]/96 px-4 py-2.5 text-[13px] font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:text-sm lg:text-base"
          >
            <Menu className="h-5 w-5" />
            เมนู
          </button>

          <div className="max-w-[58vw] truncate rounded-xl border border-white/80 bg-white/95 px-3 py-2.5 text-xs font-black text-[#7f1324] shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur">
            {selectedIncidentId ? "รายละเอียดเคส" : appTabs.find((tab) => tab.key === activeTab)?.label || "เมนู"}
          </div>
        </div>

        <UIScaleStyle />
        <HeaderGlowStyle />
        <EmergencyHeaderStyle />
        <RescueOperationalStyle />
        <header className="header-glow rescue-ops-header relative overflow-hidden rounded-[28px] border text-white">
          <EmergencyHeaderAlertBar />
          <div className="rescue-header-content flex flex-col gap-4 px-4 pb-4 pt-14 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-5 lg:pb-4 lg:pt-14">
            <div className="flex items-center gap-4">
              <div className="rescue-brand-logo relative flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[22px] border border-white/30 bg-white/10 p-2 shadow-[0_16px_32px_rgba(0,0,0,0.22)] backdrop-blur sm:h-[72px] sm:w-[72px]">
                <span className="pointer-events-none absolute inset-[7px] rounded-[22px] border border-white/15" />
                <img src={hqLogo} alt="HQ Logo" className="relative h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)]" />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-[#f7dca2]">
                  {HQ_ENG_NAME}
                </div>

                <div className="text-lg font-black leading-tight sm:text-xl lg:text-2xl">{HQ_THAI_NAME}</div>

                <div className="mt-1 max-w-2xl text-[11px] sm:text-xs lg:text-sm leading-snug text-white/80">
                  14/4 ถนนคชเสนีย์ ตำบลหล่มสัก อำเภอหล่มสัก จังหวัดเพชรบูรณ์ 67110
                </div>
              </div>
            </div>

            <div className="rescue-stats-grid hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4 lg:w-[520px] lg:grid-cols-4">
  <div className="rescue-stat-card relative overflow-hidden rounded-[20px] border p-3 backdrop-blur-md">
    <span className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-full bg-white/10 blur-md" />
    <div className="relative flex items-center gap-2 text-xs text-white/82">
      <AlertTriangle className="h-4 w-4 text-[#f7dca2]" />
      อุบัติเหตุทั้งหมด
    </div>
    <div className="relative mt-1 text-2xl font-black tracking-tight">{dashboardStats.accident}</div>
  </div>

  <div className="rescue-stat-card relative overflow-hidden rounded-[20px] border p-3 backdrop-blur-md">
    <span className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-full bg-white/10 blur-md" />
    <div className="relative flex items-center gap-2 text-xs text-white/82">
      <HeartPulse className="h-4 w-4 text-[#f7dca2]" />
      ผู้ป่วยฉุกเฉินทั้งหมด
    </div>
    <div className="relative mt-1 text-2xl font-black tracking-tight">{dashboardStats.emergency}</div>
  </div>

  <div className="rescue-stat-card relative overflow-hidden rounded-[20px] border p-3 backdrop-blur-md">
    <span className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-full bg-white/10 blur-md" />
    <div className="relative flex items-center gap-2 text-xs text-white/82">
      <FileHeart className="h-4 w-4 text-[#f7dca2]" />
      ผู้บาดเจ็บ/ผู้ป่วยทั้งหมด
    </div>
    <div className="relative mt-1 text-2xl font-black tracking-tight">
      {dashboardStats.injuredAndEmergencyTotal}
    </div>
  </div>

  <div className="rescue-stat-card relative overflow-hidden rounded-[20px] border p-3 backdrop-blur-md">
    <span className="pointer-events-none absolute inset-x-2 top-1 h-1/2 rounded-full bg-white/10 blur-md" />
    <div className="relative flex items-center gap-2 text-xs text-white/82">
      <Skull className="h-4 w-4 text-[#f7dca2]" />
      ผู้เสียชีวิตทั้งหมด
    </div>
    <div className="relative mt-1 text-2xl font-black tracking-tight">{dashboardStats.deceased}</div>
  </div>
</div>
          </div>
        </header>

        <div className="rescue-mobile-user mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              ผู้ใช้งานระบบ
            </div>
            <div className="truncate text-[13px] sm:text-sm lg:text-base font-bold text-slate-900">
              {profile?.full_name || session?.user?.email || "ไม่ทราบชื่อผู้ใช้"}
            </div>
            <div className="truncate text-xs text-slate-500">
              User: {profile?.username || "-"}{" "}
            </div>
            <div className="mt-2 inline-flex rounded-xl bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#7f1324]">
              สิทธิ์: {getRoleLabel(userRole)}
            </div>
            {deviceToken ? (
              <div className="mt-2 max-w-[420px] truncate text-[11px] text-slate-500">
                Device token พร้อมใช้งาน
              </div>
            ) : null}
          </div>
        </div>

        {dbError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700 sm:text-xs">
            {dbError}
          </div>
        ) : null}

        <div
          className="rescue-main-layout mt-3 block lg:grid lg:gap-5"
          style={{
            gridTemplateColumns: "224px minmax(0,1fr)",
          }}
        >
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              <div className="rescue-user-card relative overflow-hidden rounded-[24px] border px-4 py-4 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,38,63,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.30),transparent_45%)]" />
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="relative min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    ผู้ใช้งานระบบ
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-slate-900">
                    {profile?.full_name || session?.user?.email || "ไม่ทราบชื่อผู้ใช้"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    User: {profile?.username || "-"}{" "}
                  </div>
                  <div className="mt-2 inline-flex rounded-xl border border-rose-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] px-2.5 py-1 text-[11px] font-bold text-[#7f1324] shadow-[0_4px_10px_rgba(127,19,36,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]">
                    สิทธิ์: {getRoleLabel(userRole)}
                  </div>
                  {deviceToken ? (
                    <div className="mt-2 truncate text-[11px] text-slate-500">Device token พร้อมใช้งาน</div>
                  ) : null}
                </div>
              </div>

              <div className="rescue-sidebar-card relative flex h-auto min-h-[440px] flex-col justify-between overflow-visible rounded-[24px] border p-3 pb-5 backdrop-blur-xl lg:h-[calc(100vh-10.75rem)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(179,38,63,0.10),transparent_30%)]" />
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

                <div className="relative flex-1 space-y-2 overflow-y-auto pr-1 pb-3">
                  {appTabs.map(renderNavButton)}
                </div>

                <div className="relative shrink-0 space-y-2 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">{renderSidebarBottomActions()}</div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rescue-mobile-stats grid grid-cols-2 gap-2 sm:hidden">
  <div className="rounded-2xl bg-gradient-to-r from-[#7f1324] to-[#a51d2f] px-3 py-2 text-white shadow-md">
    <div className="text-[10px] font-semibold text-white/80">อุบัติเหตุทั้งหมด</div>
    <div className="text-base font-black">{dashboardStats.accident}</div>
  </div>
  <div className="rounded-2xl bg-gradient-to-r from-[#7f1324] to-[#a51d2f] px-3 py-2 text-white shadow-md">
    <div className="text-[10px] font-semibold text-white/80">ผู้ป่วยฉุกเฉินทั้งหมด</div>
    <div className="text-base font-black">{dashboardStats.emergency}</div>
  </div>
</div>

            <div className="rescue-content-panel mt-3 rounded-[24px] border p-2.5 backdrop-blur sm:p-4 lg:mt-0">
              <Suspense fallback={<PageLoading />}>
{selectedIncidentId ? (
                <IncidentDetailPanel
                  incident={detailIncident}
                  loading={detailLoading}
                  error={detailError}
                  onBack={closeIncidentDetail}
                  onRefresh={() => loadIncidentDetail(selectedIncidentId)}
                  currentUser={session?.user}
                  profile={profile}
                  onRecordTimelineEvent={recordTimelineEventFromApp}
                  timelineUpdating={timelineUpdating?.[detailIncident?.id] || ""}
                />
              ) : null}

              {!selectedIncidentId && activeTab === "dashboard" && (
                <DashboardPage incidents={incidents} />
              )}

              {!selectedIncidentId && activeTab === "personnel" && (
                <PersonnelPage
                  personnel={personnel}
                  loading={personnelLoading}
                  error={personnelError}
                  onRefresh={reloadPersonnel}
                />
              )}

              {!selectedIncidentId && activeTab === "form" && (
                <IncidentFormPage
                  form={form}
                  previewImages={previewImages}
                  currentPosition={currentPosition}
                  cameraInputRef={cameraInputRef}
                  attachInputRef={attachInputRef}
                  updateField={updateField}
                  updateVehicle={updateVehicle}
                  updatePatient={updatePatient}
                  addVehicle={addVehicle}
                  addPatient={addPatient}
                  removeVehicle={removeVehicle}
                  removePatient={removePatient}
                  handleFiles={handleFiles}
                  removeImage={removeImage}
                  setImageModal={setImageModal}
                  getGPSFromMobile={() => getGPS(updateMapLocation)}
                  updateMapLocation={updateMapLocation}
                  handleSubmit={handleSubmit}
                  submitting={submitting}
                  submitResult={submitResult}
                  editingIncidentId={editingIncidentId}
                  cancelEditing={cancelEditing}
                  minimalMode={true}
                />
              )}

              {!selectedIncidentId && activeTab === "command" && (
                <CommandCenterPage
                  commandDraft={commandDraft}
                  commandPosition={parseGps(commandDraft.gps)}
                  updateCommandField={(key, value) =>
                    setCommandDraft((prev) => ({ ...prev, [key]: value }))
                  }
                  updateCommandLocation={updateCommandLocation}
                  getGPSFromMobile={() => getGPS(updateCommandLocation)}
                  commandMessage={commandMessage}
                  copyAlert={copyAlert}
                  copied={copied}
                  saveCommandDraftAsIncident={saveCommandDraftAsIncident}
                  commandSaving={commandSaving}
                  incidents={incidents}
                  onUseIncident={loadIncidentIntoCommand}
                  minimalMode={true}
                  onRecordTimelineEvent={recordTimelineEventFromApp}
                  timelineUpdating={timelineUpdating}
                  onCancelIncident={cancelIncidentFromCommand}
                />
              )}

              {!selectedIncidentId && activeTab === "notifications" && (
                <NotificationsPage
                  userId={session?.user?.id}
                  onOpenIncident={openIncidentDetail}
                  onUnreadCountChange={setUnreadNotificationCount}
                />
              )}

              {!selectedIncidentId && activeTab === "report" && (
                <ReportPage
                  incidents={incidents}
                  selectedReportIds={selectedReportIds}
                  setSelectedReportIds={setSelectedReportIds}
                  reportRows={reportRows}
                  reportType={reportType}
                  setReportType={setReportType}
                  printPdf={printPdf}
                  onEditIncident={canWrite ? editIncident : undefined}
                  minimalMode={true}
                />
              )}

              {!selectedIncidentId && activeTab === "users" && isAdmin && (
                <UsersAdminPage
                  users={users}
                  loading={usersLoading}
                  onRefresh={reloadUsers}
                  onChangeRole={changeUserRole}
                  onChangeStatus={changeUserStatus}
                  onChangeStation={changeUserStation}
                  currentUserId={session?.user?.id}
                />
              )}

              {!selectedIncidentId && activeTab === "ambulances" && isAdmin && (
                <AmbulancesAdminPage />
              )}

              {!selectedIncidentId && activeTab === "admin" && isAdmin && (
                <AdminPage />
              )}
              </Suspense>
            </div>
          </div>
        </div>
      </div>


      {showInstallBanner ? (
        <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-[1200] w-[92%] max-w-md -translate-x-1/2 lg:bottom-4">
          <div className="rounded-[26px] border border-[#f3d77a]/70 bg-gradient-to-r from-[#7f1324] to-[#a51d2f] p-4 text-white shadow-[0_20px_40px_rgba(127,19,36,0.45)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black">📲 ติดตั้งแอพ</div>
                <div className="mt-1 text-sm text-white/90">
                  ติดตั้งแอปพลิเคชั่นไว้บนมือถือ เพื่อความสะดวกในการเข้าใช้งาน
                </div>
              </div>
              <button
                type="button"
                onClick={dismissInstallBanner}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
              >
                ปิด
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleInstallApp}
                className="rounded-xl bg-[#f3d77a] px-4 py-2.5 font-black text-[#7f1324] transition active:scale-[0.98] hover:brightness-105"
              >
                ติดตั้งเลย
              </button>

              <button
                type="button"
                onClick={dismissInstallBanner}
                className="rounded-xl bg-white/20 px-4 py-2.5 font-bold text-white transition active:scale-[0.98] hover:bg-white/25"
              >
                ภายหลัง
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-[980] lg:hidden" role="dialog" aria-modal="true" aria-label="เมนูหลัก">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="ปิดเมนู"
          />
          <div className="rescue-mobile-drawer absolute left-0 top-0 flex h-full w-[88%] max-w-[340px] flex-col border-r border-white/10 bg-[#570b17] p-4 text-white shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f6c85f]">
                    เมนูหลัก
                  </div>
                  <div className="mt-1 text-lg font-black text-white">{HQ_THAI_NAME}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white"
                  aria-label="ปิดเมนู"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                {appTabs.map(({ key, label, icon: Icon, badge = 0 }) => {
                  const active = activeTab === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        closeIncidentDetail();
                        setActiveTab(key);
                        setMobileSidebarOpen(false);
                      }}
                      className={`flex h-14 w-full items-center gap-3 rounded-2xl px-4 transition ${
                        active
                          ? "bg-gradient-to-r from-[#7f1324] to-[#a51d2f] text-white shadow-md shadow-rose-200"
                          : "border border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-left text-[12px] sm:text-[13px] lg:text-sm font-bold">
                        {label}
                      </span>
                      {badge > 0 ? (
                        <span className="flex min-w-6 items-center justify-center rounded-full bg-[#ffd978] px-1.5 py-1 text-[10px] font-black text-[#7f1324]">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center gap-3 border-t border-white/10 pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={getDeviceToken}
                title={notificationEnabled ? "แจ้งเตือนเปิดอยู่" : "เปิดแจ้งเตือน"}
                aria-label={notificationEnabled ? "แจ้งเตือนเปิดอยู่" : "เปิดแจ้งเตือน"}
                aria-pressed={notificationEnabled}
                className={notifyButtonClass}
              >
                <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_55%)]" />
                <Bell className="relative h-5 w-5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)]" />
                <span className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${notificationEnabled ? "bg-emerald-400" : "bg-amber-300"}`} />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className={logoutButtonClass}
              >
                <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_55%)]" />
                <LogOut className="relative h-5 w-5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.22)]" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="rescue-bottom-nav fixed inset-x-2 bottom-2 z-[950] grid grid-cols-5 gap-1 rounded-[18px] border border-[#e1c578]/30 bg-[#570c18]/97 p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.38)] backdrop-blur-xl lg:hidden"
        aria-label="เมนูด่วน"
      >
        {mobileQuickTabs.map(({ key, label, icon: Icon, badge = 0 }) => {
          const active = activeTab === key && !selectedIncidentId;
          return (
            <button
              key={`bottom-${key}`}
              type="button"
              onClick={() => {
                closeIncidentDetail();
                setActiveTab(key);
                setMobileSidebarOpen(false);
                if (typeof window !== "undefined") {
                  window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
                }
              }}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 text-[9px] font-black transition sm:text-[10px] ${
                active
                  ? "bg-gradient-to-b from-[#9b1b2e] to-[#650d1b] text-white shadow-[0_8px_18px_rgba(190,24,62,0.35)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center">{label}</span>
              {badge > 0 ? (
                <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-[#f6c85f] px-1 text-[9px] font-black text-[#7f1324]">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 text-[9px] font-black transition sm:text-[10px] ${
            !selectedIncidentId && !mobileQuickTabs.some((tab) => tab.key === activeTab)
              ? "border border-[#e2c77a]/60 bg-[#fff8df] text-[#68101d] shadow-[0_8px_18px_rgba(92,46,13,0.18)]"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
          aria-label="เปิดเมนูทั้งหมด"
        >
          <Menu className="h-5 w-5 shrink-0" />
          <span className="w-full truncate text-center">เมนู</span>
        </button>
      </nav>


      {imageModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setImageModal(null)}
            className="absolute right-4 top-4 rounded-2xl bg-white/10 px-4 py-2 text-[12px] sm:text-[13px] lg:text-sm font-bold text-white"
          >
            ปิด
          </button>
          <img
            src={imageModal}
            alt="preview"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </div>
  );
}

function RestrictedAccountScreen({ onLogout }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#7b0f1d_0%,#21060c_40%,#100206_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-lg rounded-[32px] border border-[#f3d77a]/40 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl">
        <img src={hqLogo} alt={HQ_THAI_NAME} className="mx-auto h-24 w-24 object-contain" />
        <h1 className="mt-5 text-2xl font-black">บัญชีนี้ยังไม่ได้รับอนุญาต</h1>
        <p className="mt-3 text-sm leading-7 text-white/80">
          ระบบนี้ใช้เฉพาะเจ้าหน้าที่ของหน่วยงาน บัญชีต้องมีสถานะเปิดใช้งานและได้รับบทบาทจากผู้ดูแลระบบ
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-5 rounded-2xl bg-[#f3d77a] px-5 py-3 font-black text-[#7f1324]"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const forceLoginScreen = () => {
    setSession(null);
    setProfile(null);
    setLoading(false);

    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  };

  const loadProfile = async (currentSession) => {
    if (!currentSession?.user?.id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    if (error) {
      console.error("LOAD PROFILE ERROR:", error);
      return null;
    }

    return data || null;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        const currentSession = data?.session || null;
        setSession(currentSession);

        if (currentSession) {
          const profileData = await loadProfile(currentSession);
          if (!mounted) return;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("AUTH INIT ERROR:", error);
        if (!mounted) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;

      setLoading(false);
      setSession(nextSession || null);

      if (nextSession) {
        const profileData = await loadProfile(nextSession);
        if (!mounted) return;
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setPermissionChecked(false);
      return;
    }

    const completed = localStorage.getItem("permission_setup_completed") === "true";
    setPermissionChecked(completed);
  }, [session]);

  if (loading) return <LoadingScreen />;
  if (!session) return <CommandCenterLoginScreen />;

  const accountAllowed = isRescuePersonnel(profile) && profile?.is_active !== false;
  if (!accountAllowed) {
    return (
      <RestrictedAccountScreen
        onLogout={async () => {
          await supabase.auth.signOut();
          forceLoginScreen();
        }}
      />
    );
  }

  if (!permissionChecked) {
    return (
      <PermissionSetup
        onComplete={() => {
          localStorage.setItem("permission_setup_completed", "true");
          setPermissionChecked(true);
        }}
      />
    );
  }

  return (
  <FirstLoginPasswordGate session={session} profile={profile}>
    <RescueAppShell
      session={session}
      profile={profile}
      onLogout={forceLoginScreen}
    />
  </FirstLoginPasswordGate>
);
}

export default App;

const UIScaleStyle = () => (
  <style>{`
    .ui-scale-xs {
      font-size: 13px;
    }

    .ui-scale-sm {
      font-size: 14px;
    }

    .ui-scale-base {
      font-size: 15px;
    }

    .ui-scale-lg {
      font-size: 16px;
    }

    .ui-scale-xs .responsive-tight {
      letter-spacing: -0.01em;
    }

    .ui-scale-xs .header-grid,
    .ui-scale-sm .header-grid {
      grid-template-columns: 1fr 1fr;
    }

    @media (min-width: 1024px) {
      .ui-scale-lg .app-shell-zoom {
        transform: scale(1.01);
        transform-origin: top center;
      }
    }
  `}</style>
);

const HeaderGlowStyle = () => (
  <style>{`
    .header-glow::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 32px;
      background:
        radial-gradient(circle at 18% 0%, rgba(255,255,255,0.12), transparent 25%),
        linear-gradient(120deg, transparent 34%, rgba(229,205,139,0.12), transparent 70%);
      pointer-events: none;
    }
  `}</style>
);

const RescueOperationalStyle = () => (
  <style>{`
    :root {
      --rescue-red: #b91c3b;
      --rescue-red-dark: #7f1324;
      --rescue-cream: #fff8e8;
      --rescue-gold: #f6c85f;
      --rescue-surface: #f4f7fb;
    }

    .rescue-ops-shell {
      background:
        radial-gradient(circle at 12% 0%, rgba(185, 28, 59, 0.12), transparent 27rem),
        radial-gradient(circle at 88% 4%, rgba(199, 159, 66, 0.13), transparent 25rem),
        linear-gradient(180deg, #e9eef5 0%, #f7f9fc 38%, #eef2f7 100%);
    }

    .rescue-ops-header {
      border-color: rgba(255,255,255,0.18) !important;
      background:
        linear-gradient(115deg, rgba(72,8,18,0.99) 0%, rgba(105,14,28,0.99) 52%, rgba(132,22,38,0.99) 100%) !important;
      box-shadow: 0 20px 48px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.12) !important;
    }

    .rescue-ops-header::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(209,169,73,0.16), transparent 30%, transparent 70%, rgba(225,29,72,0.18)),
        repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 12px);
    }

    .rescue-brand-logo {
      box-shadow: 0 16px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.24) !important;
    }

    .rescue-stat-card {
      min-height: 82px;
      border-color: rgba(255,255,255,0.14) !important;
      background: rgba(255,255,255,0.09) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.16) !important;
    }

    .rescue-user-card,
    .rescue-sidebar-card,
    .rescue-mobile-user,
    .rescue-content-panel {
      border-color: rgba(203,213,225,0.85) !important;
      background: rgba(255,255,255,0.93) !important;
      box-shadow: 0 16px 38px rgba(15,23,42,0.09), inset 0 1px 0 rgba(255,255,255,0.9) !important;
    }

    .rescue-sidebar-card {
      background:
        linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)) !important;
    }

    .rescue-content-panel {
      min-height: 62vh;
    }

    .rescue-mobile-toolbar {
      padding: 0.15rem;
    }

    .rescue-bottom-nav {
      scrollbar-width: none;
      padding-bottom: calc(0.375rem + env(safe-area-inset-bottom));
    }

    .rescue-bottom-nav::-webkit-scrollbar {
      display: none;
    }

    .rescue-mobile-drawer {
      background:
        radial-gradient(circle at top left, rgba(185,28,59,0.20), transparent 16rem),
        linear-gradient(180deg, #5b0b17, #39060e) !important;
    }

    .rescue-mobile-stats > div {
      border: 1px solid rgba(255,255,255,0.16);
      background: linear-gradient(120deg, #64101d, #8f1929) !important;
      box-shadow: 0 10px 24px rgba(15,23,42,0.20) !important;
    }

    @media (max-width: 639px) {
      .rescue-ops-shell {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
      }

      .rescue-ops-header {
        border-radius: 22px !important;
      }

      .rescue-header-content {
        padding-top: 4.25rem !important;
      }

      .rescue-brand-logo {
        width: 66px !important;
        height: 66px !important;
        border-radius: 18px !important;
      }

      .rescue-stats-grid {
        display: none !important;
      }

      .rescue-content-panel {
        border-radius: 20px !important;
        min-height: 58vh;
      }

    }

    @media (min-width: 640px) and (max-width: 1023px) {
    }

    @media (min-width: 1024px) {
      .rescue-main-layout {
        align-items: start;
      }

      .rescue-content-panel {
        min-height: calc(100vh - 13rem);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .header-glow::after,
      .rescue-bottom-nav {
        animation: none !important;
      }
    }
  `}</style>
);
