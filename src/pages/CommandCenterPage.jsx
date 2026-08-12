import React, { useEffect, useMemo, useState } from "react";
import {
  Siren,
  CheckCircle2,
  Clock3,
  Copy,
  FileClock,
  HeartPulse,
  MapPin,
  Phone,
  Save,
  Shield,
  ShieldAlert,
  Trash2,
  LocateFixed,
} from "lucide-react";
import { MapPicker } from "../components/common";
import { getIncidentStatusLabel } from "../components/IncidentTimeline";

const CASE_TYPES = [
  {
    value: "accident",
    label: "อุบัติเหตุ",
    desc: "รถชน รถล้ม หรืออุบัติเหตุบนท้องถนน",
    icon: Siren,
  },
  {
    value: "emergency",
    label: "ผู้ป่วยฉุกเฉิน",
    desc: "ผู้ป่วย หรือผู้บาดเจ็บจากอุบัติเหตุที่ไม่ได้เกิดจากรถ",
    icon: HeartPulse,
  },
  {
    value: "public_service",
    label: "บริการสาธารณะ",
    desc: "ช่วยเหลือทั่วไป เช่น งูเข้าบ้าน พ่วงแบต หรือเหตุบริการอื่น",
    icon: Shield,
  },
];

const RESCUE_STATIONS = [
  { value: "all", label: "ทุกพื้นที่" },
  { value: "หล่มสัก", label: "หล่มสัก" },
  { value: "หล่มเก่า", label: "หล่มเก่า" },
  { value: "เขาค้อ", label: "เขาค้อ" },
  { value: "น้ำหนาว", label: "น้ำหนาว" },
  { value: "เมือง", label: "เมือง" },
  { value: "ศรีเทพ", label: "ศรีเทพ" },
];

function getRescueStationLabel(value) {
  return RESCUE_STATIONS.find((item) => item.value === value || item.label === value)?.label || "ทุกพื้นที่";
}

const TAMBONS = [
  "หล่มสัก","วัดป่า","ตาลเดี่ยว","ฝายนาแซง","หนองสว่าง","น้ำเฮี้ย","สักหลง","ท่าอิบุญ",
  "บ้านโสก","บ้านติ้ว","ห้วยไร่","น้ำก้อ","ปากช่อง","น้ำชุน","หนองไขว่","ลานบ่า",
  "บุ่งคล้า","บุ่งน้ำเต้า","บ้านกลาง","ช้างตะลูด","บ้านไร่","ปากดุก","บ้านหวาย",
];

function parseGps(gps) {
  if (!gps || typeof gps !== "string") return null;
  const parts = gps.split(",").map((x) => Number(String(x).trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  if (parts[0] < -90 || parts[0] > 90 || parts[1] < -180 || parts[1] > 180) return null;
  return { lat: parts[0], lng: parts[1] };
}

function formatShortDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function getCaseTypeLabel(value) {
  return CASE_TYPES.find((item) => item.value === value)?.label || "-";
}

function buildMapsLink(position) {
  if (position?.lat == null || position?.lng == null) return "-";
  return `https://www.google.com/maps?q=${position.lat},${position.lng}`;
}

function buildFallbackMessage(draft, position) {
  return [
    "🚑 แจ้งเหตุ หน่วยกู้ภัยกกไทร",
    `วันที่ ${formatShortDate(draft.caseDate)}`,
    `เวลา ${draft.caseTime || "-"}`,
    `ประเภท ${getCaseTypeLabel(draft.caseType)}`,
    `พื้นที่แจ้งเตือน ${getRescueStationLabel(draft.rescueStation || "ทุกพื้นที่")}`,
    `รายละเอียด ${draft.details || draft.place || "-"}`,
    `สถานที่เกิดเหตุ ${draft.place || "-"}`,
    `ตำบล ${draft.tambon || "-"}`,
    `เบอร์ผู้แจ้งเหตุ ${draft.reporterPhone || "-"}`,
    `Google Maps ${buildMapsLink(position)}`,
  ].join("\n");
}

function getStatusBadge(status) {
  if (status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "transporting") return "bg-[#fff8df] text-[#6d4610] border-[#dac17e]";
  if (status === "on_scene") return "bg-violet-50 text-violet-700 border-violet-200";
  if (status === "departed" || status === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "cancelled") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-rose-50 text-[#7f1324] border-rose-200";
}

export default function CommandCenterPage({
  commandDraft,
  commandPosition,
  updateCommandField = () => {},
  updateCommandLocation = () => {},
  getGPSFromMobile = () => {},
  commandMessage,
  copyAlert = () => {},
  copied,
  saveCommandDraftAsIncident,
  commandSaving,
  incidents = [],
  onUseIncident,
  onRecordTimelineEvent,
  timelineUpdating = {},
  onCancelIncident,
}) {
  const draft = commandDraft || {};
  const normalizeRescueStation = (value) => {
    const text = String(value || "").trim();
    if (!text) return "all";
    if (text === "ทุกพื้นที่" || text.toLowerCase() === "all") return "all";
    const found = RESCUE_STATIONS.find((item) => item.value === text || item.label === text);
    return found?.value || text;
  };
  const [localIncidents, setLocalIncidents] = useState(Array.isArray(incidents) ? incidents : []);
  const [targetRescueStation, setTargetRescueStation] = useState("all");

  const selectedRescueStation = normalizeRescueStation(
    targetRescueStation || draft.rescueStation || "all"
  );
  const selectedRescueStationLabel = getRescueStationLabel(selectedRescueStation);

  useEffect(() => {
    setLocalIncidents(Array.isArray(incidents) ? incidents : []);
  }, [incidents]);

  const position = useMemo(() => {
    if (commandPosition && typeof commandPosition === "object") return commandPosition;
    return parseGps(draft.gps || "");
  }, [commandPosition, draft.gps]);

  const incidentList = Array.isArray(localIncidents) ? localIncidents : [];
  const draftForPreview = { ...draft, rescueStation: selectedRescueStation };
  const previewMessage = commandMessage || buildFallbackMessage(draftForPreview, position);

  const visibleIncidents = useMemo(
    () => [...incidentList]
      .filter((item) => item?.status !== "cancelled")
      .sort((a, b) => new Date(`${b?.incident_date || ""} ${b?.incident_time || ""}`) - new Date(`${a?.incident_date || ""} ${a?.incident_time || ""}`))
      .slice(0, 8),
    [incidentList]
  );

  const setNow = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    updateCommandField("caseDate", `${yyyy}-${mm}-${dd}`);
    updateCommandField("caseTime", `${hh}:${mi}`);
  };

  const confirmSave = () => {
    const ok = window.confirm([
      "ยืนยันบันทึกแจ้งเหตุใช่หรือไม่?",
      `วันที่: ${formatShortDate(draft.caseDate)}`,
      `เวลา: ${draft.caseTime || "-"}`,
      `ประเภท: ${getCaseTypeLabel(draft.caseType)}`,
      `พื้นที่แจ้งเตือน: ${selectedRescueStationLabel}`,
      `รายละเอียด: ${draft.details || "-"}`,
      `สถานที่เกิดเหตุ: ${draft.place || "-"}`,
      `ตำบล: ${draft.tambon || "-"}`,
      `เบอร์ผู้แจ้งเหตุ: ${draft.reporterPhone || "-"}`,
    ].join("\n"));
    if (!ok) return;
    saveCommandDraftAsIncident?.({
      rescueStation: selectedRescueStation,
      targetStation: selectedRescueStation,
      notificationTitle: `แจ้งเหตุใหม่ ${draft.caseId || ""}`.trim(),
      notificationBody: previewMessage,
    });
  };

  const confirmCancelCase = (item) => {
    const ok = window.confirm(`ยืนยันยกเลิกเคส ${item?.case_id || "-"} และลบรายการนี้ใช่หรือไม่?`);
    if (!ok) return;

    setLocalIncidents((prev) => prev.filter((incident) => incident?.id !== item?.id));
    onCancelIncident?.(item);
  };



  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[28px] border border-[#f3d37f]/55 bg-[linear-gradient(180deg,#c52a42_0%,#99172b_42%,#6b0d1c_72%,#420811_100%)] p-4 sm:p-5 text-white shadow-[0_22px_40px_rgba(90,10,24,0.34),0_8px_0_rgba(92,10,24,0.95),inset_0_2px_0_rgba(255,255,255,0.28),inset_0_-10px_18px_rgba(50,6,14,0.28)]">
  <span className="pointer-events-none absolute inset-[1px] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_36%,transparent_60%)]" />
  <span className="pointer-events-none absolute left-6 top-0 h-14 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black drop-shadow-[0_3px_3px_rgba(0,0,0,.45)]">ศูนย์แจ้งเหตุฉุกเฉินแบบเรียลไทม์</h2>
            <p className="mt-2 text-sm text-white/80">แจ้งเหตุแบบเรียลไทม์ แจ้งเตือนผ่านแอปพลิเคชั่น</p>
          </div>
          </div>
  <span className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/18 blur-xl" />
      </div>


      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-b from-white to-[#fbf5e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(127,19,36,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">แบบฟอร์มด่วน</div>
                <h3 className="mt-1 text-lg font-black text-slate-900">ข้อมูลแจ้งเหตุ</h3>
              </div>
              <div className="rounded-2xl bg-[#fff4d8] px-4 py-2 text-xs font-black text-[#7f1324]">
                เลขเคส: {draft.caseId || "-"}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <Field label="วันที่" icon={FileClock}><Input type="date" value={draft.caseDate || ""} onChange={(v) => updateCommandField("caseDate", v)} /></Field>
              <Field label="เวลา" icon={Clock3}><Input type="time" value={draft.caseTime || ""} onChange={(v) => updateCommandField("caseTime", v)} /></Field>
              <div className="flex items-end">
                <button type="button" onClick={setNow} className="w-full rounded-2xl bg-gradient-to-b from-[#b98b2f] to-[#7f1324] px-3 py-2.5 text-sm font-black text-white shadow-[0_5px_0_#5f0b17,0_12px_24px_rgba(95,11,23,0.24)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#5f0b17] hover:brightness-105">ตอนนี้</button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-bold text-slate-700">ประเภทเคส</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CASE_TYPES.map((item) => {
  const active = draft.caseType === item.value;
  const Icon = item.icon;

  return (
    <button
      key={item.value}
      type="button"
      onClick={() => updateCommandField("caseType", item.value)}
      className={`w-full rounded-[24px] border-2 p-4 text-left transition-all duration-200 active:translate-y-[2px] ${
        active
          ? "border-[#d9b86a] bg-gradient-to-b from-[#fff8ea] to-[#f2dfb8] text-[#5f0f1b] shadow-[0_6px_0_#d4a84f,0_14px_28px_rgba(127,19,36,0.18)]"
          : "border-[#ead9b3] bg-gradient-to-b from-white to-[#faf5ea] text-slate-900 shadow-[0_4px_0_#ead9b3,0_10px_22px_rgba(212,168,79,0.14)] hover:border-[#d8c08a] hover:brightness-105"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            active
              ? "bg-gradient-to-br from-[#7f1324] to-[#a91d31] text-[#f0cf88] shadow-sm"
              : "bg-[#fff2d1] text-[#7f1324]"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <div
            className={`text-sm font-black ${
              active ? "text-[#7f1324]" : "text-slate-900"
            }`}
          >
            {item.label}
          </div>
          <div
            className={`mt-1 text-xs leading-5 ${
              active ? "text-slate-700" : "text-slate-500"
            }`}
          >
            {item.desc}
          </div>
        </div>
      </div>
    </button>
  );
})}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border-2 border-[#d4a84f] bg-gradient-to-b from-[#fffaf0] to-[#f6edd9] p-4 shadow-[0_4px_0_#d4a84f,0_10px_22px_rgba(212,168,79,0.18)]">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <MapPin className="h-4 w-4 text-[#7f1324]" />
                <span>เลือกพื้นที่ส่งแจ้งเตือน</span>
              </div>

              <select
                aria-label="เลือกพื้นที่ส่งแจ้งเตือน"
                value={targetRescueStation}
                onChange={(e) => {
                  const station = e.target.value;
                  setTargetRescueStation(station);
                  updateCommandField?.("rescueStation", station);
                }}
                className="w-full rounded-2xl border-2 border-[#d4a84f] bg-white px-4 py-3 text-sm font-black text-[#7f1324] outline-none focus:border-[#7f1324] focus:ring-2 focus:ring-[#f0cf88]"
              >
                {RESCUE_STATIONS.map((station) => (
                  <option key={station.value} value={station.value}>
                    {station.label}
                  </option>
                ))}
              </select>
              </div>

            <div className="mt-5 grid gap-4">
              <Field label="รายละเอียด" icon={ShieldAlert}><Textarea value={draft.details || draft.place || ""} onChange={(v) => updateCommandField("details", v)} placeholder="ระบุรายละเอียดเหตุ / อาการ / ลักษณะงานบริการ" /></Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="สถานที่เกิดเหตุ" icon={MapPin}><Input value={draft.place || ""} onChange={(v) => updateCommandField("place", v)} placeholder="เช่น หน้าตลาด / ถนนสาย / บ้าน..." /></Field>
                <Field label="ตำบล" icon={MapPin}>
                  <>
                    <Input value={draft.tambon || ""} onChange={(v) => updateCommandField("tambon", v)} placeholder="กรอกหรือเลือกตำบล" list="command-tambons" />
                    <datalist id="command-tambons">{TAMBONS.map((tambon) => <option key={tambon} value={tambon} />)}</datalist>
                  </>
                </Field>
              </div>

              <Field label="เบอร์โทรผู้แจ้ง" icon={Phone}><Input type="tel" value={draft.reporterPhone || ""} onChange={(v) => updateCommandField("reporterPhone", v)} placeholder="เช่น 08x-xxx-xxxx" /></Field>

              <div className="rounded-[26px] border border-slate-200 bg-[#fcf8ef] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">แผนที่จุดเกิดเหตุ</div>
                    <div className="text-xs text-slate-500">กดบนแผนที่เพื่อปักหมุด หรือดึงตำแหน่งปัจจุบันจากมือถือ</div>
                  </div>
                  <button type="button" onClick={getGPSFromMobile} className="rounded-2xl bg-gradient-to-b from-[#b98b2f] to-[#7f1324] px-3 py-2.5 text-sm font-bold text-white shadow-[0_5px_0_#5f0b17,0_12px_24px_rgba(95,11,23,0.24)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#5f0b17] hover:brightness-105">ดึง GPS ปัจจุบัน</button>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border-2 border-[#d4a84f] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(127,19,36,0.10)]">
                  <div
                    id={position?.lat && position?.lng ? `command-map-pin-${Number(position.lat).toFixed(6)}-${Number(position.lng).toFixed(6)}` : undefined}
                    className="h-[320px] w-full scroll-mt-24 bg-slate-100"
                  >
                    <MapPicker position={position} mapLabel={draft.place || "แตะบนแผนที่เพื่อปักหมุด"} onPick={updateCommandLocation} incidents={[]} />
                  </div>

                  <div className="pointer-events-none absolute left-3 top-3 rounded-2xl bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">
                    {position?.lat && position?.lng
                      ? `พิกัดล่าสุด ${Number(position.lat).toFixed(6)}, ${Number(position.lng).toFixed(6)}`
                      : "ยังไม่มีพิกัดที่เลือก"}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-[#ead9b3] bg-[#fff8ea] px-3 py-1 font-bold text-[#7f1324]">
                    ถ้าแผนที่ยังไม่ขึ้น ให้ลองรีเฟรชหน้า 1 ครั้ง
                  </span>
                  {position?.lat && position?.lng ? (
                    <>
                      <a
                        href={`#command-map-pin-${Number(position.lat).toFixed(6)}-${Number(position.lng).toFixed(6)}`}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-700 transition hover:brightness-105"
                      >
                        <LocateFixed className="h-3.5 w-3.5" /> เลื่อนไปยังจุดที่ปักหมุด
                      </a>
                      <a
                        href={buildMapsLink(position)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#dac17e] bg-[#fff8df] px-3 py-1 font-bold text-[#7f1324]"
                      >
                        เปิดใน Google Maps
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-b from-white to-[#fbf5e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(127,19,36,0.08)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ควบคุมการแจ้งเตือน</div>
                <h3 className="mt-1 text-lg font-black text-slate-900">ส่งต่อเหตุและบันทึกข้อมูล</h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button type="button" onClick={confirmSave} disabled={commandSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#c6283f] via-[#9d1b2f] to-[#7f1324] px-3 py-2.5 text-sm font-black text-white shadow-[0_6px_0_#5f0f1b,0_14px_28px_rgba(127,19,36,0.32)] transition active:translate-y-[2px] active:shadow-[0_3px_0_#5f0f1b] disabled:opacity-60">
                <Save className="h-4 w-4" /> {commandSaving ? "กำลังบันทึก..." : "บันทึกและส่งแจ้งเหตุ"}
              </button>
             
              <button type="button" onClick={copyAlert} className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#d4a84f] bg-gradient-to-b from-white to-[#f6edd9] px-4 py-3 text-sm font-black text-slate-700 shadow-[0_4px_0_#d4a84f,0_10px_22px_rgba(212,168,79,0.22)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#d4a84f]">
                <Copy className="h-4 w-4" /> {copied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}
              </button>
            </div>

            
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-b from-white to-[#fbf5e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(127,19,36,0.08)]">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#7f1324]" />
              <h3 className="text-lg font-black text-slate-900">ตัวอย่างข้อความแจ้งเหตุ</h3>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-[24px] border border-slate-200 bg-[#fcf8ef] p-4 text-sm leading-6 text-slate-800">{previewMessage}</pre>
          </div>

          <div className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-b from-white to-[#fbf5e8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_rgba(127,19,36,0.08)]">
            <div className="mb-4 flex items-center gap-2">
              <FileClock className="h-5 w-5 text-[#7f1324]" />
              <h3 className="text-lg font-black text-slate-900">รายการเคสล่าสุด</h3>
            </div>

            <div className="space-y-3">
              {!visibleIncidents.length ? (
                <div className="rounded-[24px] border border-dashed border-[#ddc690] bg-gradient-to-br from-[#fffaf0] to-[#faf4e7] px-5 py-8 text-center text-sm font-medium text-slate-500">ไม่มีรายการเคสในระบบ</div>
              ) : (
                visibleIncidents.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-white to-[#faf5ea] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{item.case_id || "-"}</div>
                          <div className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusBadge(item.status)}`}>{getIncidentStatusLabel(item.status)}</div>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-slate-700">
                          <div><span className="font-bold">ประเภท:</span> {getCaseTypeLabel(item.case_type)}</div>
                          <div><span className="font-bold">รายละเอียด:</span> {item.details || item.description || "-"}</div>
                          <div><span className="font-bold">สถานที่:</span> {item.place || item.location_text || "-"}</div>
                        </div>
                      </div>
                    </div>


                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => onUseIncident?.(item)} className="rounded-2xl bg-gradient-to-b from-[#a91d31] to-[#7f1324] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_#5f0f1b,0_10px_18px_rgba(127,19,36,0.28)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#5f0f1b] hover:brightness-105">นำมาใช้ต่อ</button>
                      <button type="button" onClick={() => confirmCancelCase(item)} className="rounded-2xl border-2 border-rose-300 bg-gradient-to-b from-rose-50 to-rose-100 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-[0_4px_0_#fda4af,0_10px_18px_rgba(244,63,94,0.18)] transition active:translate-y-[2px] active:shadow-[0_2px_0_#fda4af] hover:brightness-105">
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" /> ยกเลิกเคส
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Field({ label, children, icon: Icon }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
        {Icon ? <Icon className="h-4 w-4 text-[#7f1324]" /> : null}
        <span>{label}</span>
      </div>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", placeholder = "", list }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} list={list} className="w-full rounded-2xl border-2 border-[#d4a84f] bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_2px_4px_rgba(127,19,36,0.06)] outline-none ring-0 placeholder:text-slate-400 transition focus:border-[#7f1324] focus:ring-2 focus:ring-[#f0cf88]" />
  );
}

function Textarea({ value, onChange, placeholder = "" }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-2xl border-2 border-[#d4a84f] bg-white px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_2px_4px_rgba(127,19,36,0.06)] outline-none ring-0 placeholder:text-slate-400 transition focus:border-[#7f1324] focus:ring-2 focus:ring-[#f0cf88]" />
  );
}
