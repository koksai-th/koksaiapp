import React, { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, CheckCheck, Inbox, Loader2, RefreshCw } from "lucide-react";
import {
  loadInboxNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications";
import { supabase } from "../lib/supabaseClient";

function formatNotificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationTarget(item) {
  const notification = item?.notification || {};
  const data = notification.data || {};
  return (
    data.url ||
    (notification.incident_id ? `/incident/${notification.incident_id}` : "") ||
    (data.incident_id ? `/incident/${data.incident_id}` : "") ||
    (data.case_id ? `/incident/${data.case_id}` : "") ||
    (data.caseId ? `/incident/${data.caseId}` : "") ||
    ""
  );
}

export default function NotificationsPage({ userId, onOpenIncident, onUnreadCountChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await loadInboxNotifications(userId);
      setItems(rows);
    } catch (err) {
      console.error("load notification inbox error:", err);
      setError(err.message || "โหลดกล่องแจ้งเตือนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`notification-inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const openItem = async (item) => {
    const notificationId = item?.notification_id;
    if (!item?.read_at && notificationId) {
      try {
        await markNotificationRead(notificationId, userId);
        setItems((prev) => prev.map((row) => (
          row.notification_id === notificationId
            ? { ...row, read_at: new Date().toISOString() }
            : row
        )));
      } catch (err) {
        console.error("mark notification read error:", err);
      }
    }

    const target = getNotificationTarget(item);
    if (target) onOpenIncident?.(target);
  };

  const markAllRead = async () => {
    if (!unreadCount || updating) return;
    setUpdating(true);
    try {
      await markAllNotificationsRead(userId);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || now })));
    } catch (err) {
      window.alert(err.message || "ทำเครื่องหมายอ่านทั้งหมดไม่สำเร็จ");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[#f3d37f] bg-gradient-to-b from-[#b51f35] via-[#8f1728] to-[#5f0b18] p-4 text-white shadow-[0_18px_0_rgba(95,11,24,0.85),0_28px_45px_rgba(90,10,24,0.35),inset_0_2px_0_rgba(255,255,255,0.3)]"><span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/20" /><span className="pointer-events-none absolute left-8 top-0 h-20 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-lg sm:text-xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.35)]">
              <BellRing className="h-6 w-6 text-[#f7d892]" /> กล่องแจ้งเตือน
            </div>
            <div className="mt-1 text-xs text-white/80">
              ยังไม่อ่าน {unreadCount} รายการ จากทั้งหมด {items.length} รายการ
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
            </button>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount || updating}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#7f1324] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              อ่านทั้งหมดแล้ว
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      {loading && !items.length ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7f1324]" />
          <div className="mt-3 font-bold">กำลังโหลดแจ้งเตือน...</div>
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="rounded-[28px] border border-dashed border-[#d9bf82] bg-[#fffaf0] p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-[#b78b35]" />
          <div className="mt-3 text-lg font-black text-slate-800">ยังไม่มีแจ้งเตือน</div>
          <div className="mt-1 text-xs text-white/80">รายการแจ้งเหตุใหม่จะปรากฏที่หน้านี้</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const notification = item.notification || {};
          const unread = !item.read_at;
          const target = getNotificationTarget(item);
          return (
            <button
              key={`${item.notification_id}-${item.user_id}`}
              type="button"
              onClick={() => openItem(item)}
              className={`w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                unread
                  ? "border-[#d4a84f] bg-gradient-to-r from-[#fff3cf] to-white shadow-[0_10px_26px_rgba(127,19,36,0.10)]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${unread ? "bg-[#7f1324] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {unread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={`text-sm ${unread ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                      {notification.title || "แจ้งเตือนกู้ภัยกกไทร"}
                    </div>
                    <div className="text-[11px] text-slate-500">{formatNotificationTime(notification.created_at || item.created_at)}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs leading-5 text-slate-700">
                    <div><span className="font-bold text-[#7f1324]">เลขที่เคส:</span> {notification.data?.case_id || notification.data?.caseId || "-"}</div>
                    <div><span className="font-bold text-[#7f1324]">วันที่:</span> {notification.data?.case_date || "-"}</div>
                    <div><span className="font-bold text-[#7f1324]">เวลา:</span> {notification.data?.case_time || "-"}</div>
                    <div><span className="font-bold text-[#7f1324]">ประเภท:</span> {notification.data?.case_type || "-"}</div>
                    <div className="col-span-2"><span className="font-bold text-[#7f1324]">รายละเอียด:</span> {notification.body || "-"}</div>
                    <div className="col-span-2"><span className="font-bold text-[#7f1324]">สถานที่:</span> {notification.data?.place || "-"}</div>
                    <div><span className="font-bold text-[#7f1324]">โทร:</span> {notification.data?.reporter_phone || "-"}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-full px-2.5 py-1 font-bold ${unread ? "bg-rose-100 text-[#7f1324]" : "bg-slate-100 text-slate-500"}`}>
                      {unread ? "ยังไม่อ่าน" : "อ่านแล้ว"}
                    </span>
                    {target ? <span className="font-bold text-[#7f1324]">แตะเพื่อเปิดรายละเอียดเคส</span> : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
