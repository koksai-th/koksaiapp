/*
 IncidentTimeline_confirm_w25_fixed.jsx

 เพิ่ม:
 - ตรวจสอบเวลาแจ้งเหตุก่อนกด ว.25
 - ถ้าเกิน 10 นาที แสดงหน้าต่างยืนยัน
 - ยืนยันแล้วจึงส่ง event ไปบันทึก
*/
/*
 IncidentTimeline_flow_fixed.jsx

 Flow:
 ว.25 ที่เกิดเหตุ
 -> ว.22 ที่เกิดเหตุ
 -> เคลื่อนย้าย ว.25 รพ.
 -> ว.22 รพ.
 -> ว.14 เหตุ
 -> ปิดเคส

 ปุ่มถัดไปเปิดเมื่อขั้นก่อนหน้าถูกบันทึก
*/
import React from "react";
import { Ambulance, CheckCircle2, Clock3, Loader2, MapPin, Navigation, Hospital } from "lucide-react";

export const INCIDENT_TIMELINE_STEPS = [
  { eventType:"w25_scene", field:"w25_scene_at", byField:"w25_scene_by", label:"ว.25 ที่เกิดเหตุ", actionLabel:"ว.25 ที่เกิดเหตุ", icon:Navigation },
  { eventType:"w22_scene", field:"w22_scene_at", byField:"w22_scene_by", label:"ว.22 ที่เกิดเหตุ", actionLabel:"ว.22 ที่เกิดเหตุ", icon:MapPin },
  { eventType:"move_hospital", field:"move_hospital_at", byField:"move_hospital_by", label:"เคลื่อนย้าย ว.25 รพ.", actionLabel:"เคลื่อนย้าย ว.25 รพ.", icon:Ambulance },
  { eventType:"w22_hospital", field:"w22_hospital_at", byField:"w22_hospital_by", label:"ว.22 รพ.", actionLabel:"ว.22 รพ.", icon:Hospital },
  { eventType:"w14_scene", field:"w14_scene_at", byField:"w14_scene_by", label:"ว.14 เหตุ", actionLabel:"ว.14 เหตุ", icon:MapPin },
  { eventType:"closed", field:"closed_at", byField:"closed_by", label:"ปิดเคส", actionLabel:"ปิดเคส", icon:CheckCircle2 },
];

export const INCIDENT_STATUS_LABELS = {
  open: "รอออกปฏิบัติการ",
  in_progress: "กำลังดำเนินการ",
  departed: "ออกจากฐานแล้ว",
  on_scene: "ถึงจุดเกิดเหตุแล้ว",
  transporting: "กำลังนำส่ง",
  closed: "ปิดเคสแล้ว",
  cancelled: "ยกเลิกเคส",
};

export function getIncidentStatusLabel(status) {
  return INCIDENT_STATUS_LABELS[status] || status || "รอออกปฏิบัติการ";
}

export function formatTimelineDateTime(value){
  if(!value) return "ยังไม่บันทึก";
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("th-TH",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
}

function canRecordStep(incident, step, currentUser){
  if(!incident || incident.closed_at) return false;

  switch(step.eventType){
    case "w25_scene":
      return !incident.w25_scene_at;

    case "w22_scene":
      return Boolean(incident.w25_scene_at) && !incident.w22_scene_at;

    case "move_hospital":
      return Boolean(incident.w22_scene_at) && !incident.move_hospital_at;

    case "w22_hospital":
      return Boolean(incident.move_hospital_at) && !incident.w22_hospital_at;

    case "w14_scene":
      return Boolean(
        incident.w25_scene_at ||
        incident.w22_scene_at ||
        incident.w22_hospital_at
      ) && !incident.w14_scene_at;

    case "closed":
      return Boolean(incident.w14_scene_at) && !incident.closed_at;

    default:
      return false;
  }
}

export default function IncidentTimeline({
  incident,
  onRecordEvent,
  updatingEvent = "",
  currentUser,
  compact = false,
  readOnly = false,
}) {
  if (!incident) return null;

  const handleRecordClick = (step) => {
    if (step.eventType === "w25_scene") {
      const incidentDateTime = new Date(
        `${incident.incident_date || ""} ${incident.incident_time || ""}`
      );

      if (!Number.isNaN(incidentDateTime.getTime())) {
        const now = new Date();
        const diffMinutes = Math.floor((now - incidentDateTime) / 60000);

        if (diffMinutes >= 10) {
          const confirmed = window.confirm(
            `เกิดเหตุมาผ่านแล้ว ${diffMinutes} นาที\nยืนยันว่าจะ ว.25 ที่เกิดเหตุ ใช่หรือไม่?`
          );

          if (!confirmed) return;
        }
      }
    }

    onRecordEvent?.(incident, step.eventType, step.label);
  };

  return (
    <section className={`rounded-[24px] border border-[#ead9b3] bg-[#fffaf0] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2 text-sm font-black text-[#7f1324]">
        <Clock3 className="h-4 w-4" /> ลำดับเวลาออกปฏิบัติงาน
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {INCIDENT_TIMELINE_STEPS.map((step) => {
          const Icon = step.icon;
          const recorded = Boolean(incident[step.field]);
          const enabled = !readOnly && canRecordStep(incident, step, currentUser);

          return (
            <div key={step.eventType} className={`rounded-2xl border p-3 ${recorded ? "bg-green-50 border-green-200" : enabled ? "bg-white border-[#d4a84f]" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex gap-2 items-center">
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-black text-xs">{step.label}</div>

                  {recorded && (
                    <div className="mt-1 text-[11px] text-green-700">
                      เวลา: {formatTimelineDateTime(incident[step.field])}

                    </div>
                  )}
                </div>
              </div>

              {!recorded && enabled && (
                <button
                  type="button"
                  disabled={Boolean(updatingEvent)}
                  onClick={() => handleRecordClick(step)}
                  className="mt-3 w-full rounded-xl bg-[#7f1324] px-3 py-2 text-xs font-black text-white"
                >
                  {updatingEvent === step.eventType ? (
                    <Loader2 className="inline h-4 w-4 animate-spin" />
                  ) : null}
                  {step.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
