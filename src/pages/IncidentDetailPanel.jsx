/*
 IncidentDetailPanel_build_fixed.jsx

แก้ไข:
- ปิด div Header 3D ที่ขาดหาย ทำให้ Vite build ผ่าน
- ปรับปุ่มกลับหน้าหลักใน Header 3D
- ส่ง incident เข้า IncidentChat เพื่อแสดงเลขเคส
*/
/*
 IncidentDetailPanel_3D_timeline_map_fixed.jsx

ปรับปรุง:
- Header 3D Premium
- รายละเอียดเคสคงรูปแบบกระชับ
- ปุ่มแผนที่เตรียมรองรับ Focus Marker
- Timeline flow ใช้ IncidentTimeline ต่อ

Source: IncidentDetailPanel(3).jsx
*/

import React from "react";
import IncidentChat from "../components/IncidentChat";
import IncidentTimeline, { getIncidentStatusLabel } from "../components/IncidentTimeline";

function normalizeIncidentType(type) {
  if (type === "accident") return "อุบัติเหตุ";
  if (type === "emergency") return "ผู้ป่วยฉุกเฉิน";
  if (type === "public_service") return "บริการสาธารณะ";
  return type || "-";
}

function getIncidentDisplayDate(incident) {
  return incident?.incident_date || incident?.case_date || incident?.caseDate || "-";
}

function getIncidentDisplayTime(incident) {
  const value = incident?.incident_time || incident?.time || incident?.caseTime || "";
  return value ? String(value).slice(0, 5) : "-";
}

export default function IncidentDetailPanel({
  incident,
  loading,
  error,
  onBack,
  onRefresh,
  currentUser,
  profile,
  onRecordTimelineEvent,
  timelineUpdating,
}) {
  if (loading) {
    return (
      <div className="rounded-[30px] border border-white/60 bg-white/90 p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="text-lg font-black text-[#7f1324]">กำลังโหลดรายละเอียดเคส...</div>
        <div className="mt-2 text-sm text-slate-500">ระบบกำลังเปิดข้อมูลจากแถบแจ้งเตือน</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="rounded-[30px] border border-red-200 bg-white/95 p-5 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="text-lg font-black text-red-700">ไม่พบรายละเอียดเคส</div>
        <div className="mt-2 text-sm text-slate-500">{error || "ไม่พบข้อมูลในฐานข้อมูล"}</div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onRefresh} className="rounded-2xl bg-[#7f1324] px-4 py-2 text-sm font-black text-white">
            โหลดใหม่
          </button>
          <button type="button" onClick={onBack} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const gps =
    incident.gps_text ||
    (incident.gps_lat != null && incident.gps_lng != null
      ? `${incident.gps_lat}, ${incident.gps_lng}`
      : "");
  const mapsUrl = gps ? `https://www.google.com/maps?q=${encodeURIComponent(gps)}` : "";

  return (
    <div className="rounded-[30px] border border-white/70 bg-white/95 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.10)] sm:p-5">
      <div className="relative overflow-hidden rounded-[28px] border border-[#e7c56a] bg-gradient-to-br from-[#9d1830] via-[#7f1324] to-[#4c0712] p-4 text-white shadow-[0_20px_40px_rgba(80,10,20,.35),0_8px_0_rgba(70,5,15,.9)]"><div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent"/><div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f8df9b]">Incident Detail</div>
          <h1 className="mt-1 text-2xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,.4)]">รายละเอียดเคส {incident.case_id || ""}</h1>
          <p className="mt-1 text-sm text-white/80">เปิดจากการกดแถบแจ้งเตือน</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-2xl bg-white/15 border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/25">
          กลับหน้าหลัก
        </button>
      </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-red-50 p-3">
          <div className="text-xs font-bold text-slate-500">วันที่ / เวลา</div>
          <div className="mt-1 font-black text-slate-900">{getIncidentDisplayDate(incident)} เวลา {getIncidentDisplayTime(incident)} น.</div>
        </div>
        <div className="rounded-2xl bg-red-50 p-3">
          <div className="text-xs font-bold text-slate-500">ประเภทเคส</div>
          <div className="mt-1 font-black text-[#7f1324]">{normalizeIncidentType(incident.case_type)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <div className="text-xs font-bold text-slate-500">สถานที่เกิดเหตุ</div>
          <div className="mt-1 font-bold text-slate-900">{incident.place || incident.location_text || "-"}</div>
          <div className="mt-1 text-sm text-slate-600">ตำบล: {incident.tambon || incident.subdistrict || "-"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <div className="text-xs font-bold text-slate-500">รายละเอียด</div>
          <div className="mt-1 whitespace-pre-wrap font-medium leading-7 text-slate-900">
            {incident.accident_details || incident.details || "-"}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">เบอร์ผู้แจ้ง</div>
          <div className="mt-1 font-black text-slate-900">{incident.reporter_phone || "-"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">สถานะ</div>
          <div className="mt-1 font-black text-slate-900">{getIncidentStatusLabel(incident.status)}</div>
        </div>
      </div>
   
      {mapsUrl ? (
        <div className="mt-4">
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-[#7f1324] px-4 py-2.5 text-sm font-black text-white shadow-md hover:brightness-110">
            เปิดแผนที่โฟกัสจุดเกิดเหตุ
          </a>
        </div>
      ) : null}

       <div className="mt-4">
        <IncidentTimeline
          incident={incident}
          onRecordEvent={onRecordTimelineEvent}
          updatingEvent={timelineUpdating || ""}
          currentUser={currentUser}
          profile={profile}
        />
      </div>

      <IncidentChat incidentId={incident.id} incident={incident} currentUser={currentUser} profile={profile} />
    </div>
  );
}
