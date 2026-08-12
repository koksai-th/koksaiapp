import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Siren,
  Camera,
  CarFront,
  ClipboardList,
  FileText,
  HeartPulse,
  MapPin,
  Plus,
  Shield,
  Trash2,
  Upload,
  X,
  ChevronDown,
  LocateFixed,
  Crosshair,
  Navigation,
  MapPinned,
} from "lucide-react";
import { Input, MapPicker, SectionShell, Select } from "../components/common";
import { formatThaiDateShort } from "../lib/dateUtils";

const embossedButton = "rounded-2xl min-h-12 px-5 py-3 text-base font-bold text-white transition-all duration-150 active:translate-y-[2px]";
const embossedBlueButton = `${embossedButton} bg-gradient-to-b from-[#b98b2f] to-[#7f1324] shadow-[0_6px_0_#5f0b17,0_10px_20px_rgba(0,0,0,0.25)] active:shadow-[0_3px_0_#5f0b17]`;
const embossedDarkButton = `${embossedButton} bg-gradient-to-b from-[#6f0f1e] to-[#3b0710] shadow-[0_6px_0_#25050a,0_10px_20px_rgba(0,0,0,0.25)] active:shadow-[0_3px_0_#25050a]`;
const embossedRedButton = `${embossedButton} bg-gradient-to-b from-[#b11f33] via-[#8f1728] to-[#6b1020] shadow-[0_7px_0_#4a0b16,0_14px_28px_rgba(0,0,0,0.28)] active:shadow-[0_3px_0_#4a0b16]`;
const embossedGoldButton = `${embossedButton} bg-gradient-to-b from-[#d8b35b] to-[#9b6b1d] shadow-[0_6px_0_#6f4b11,0_10px_20px_rgba(0,0,0,0.24)] active:shadow-[0_3px_0_#6f4b11]`;
const fieldShellClass = "[&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border-2 [&_input]:border-[#d4a84f] [&_input]:bg-white [&_input]:px-4 [&_input]:text-base [&_input]:text-slate-900 [&_input]:shadow-[inset_0_2px_4px_rgba(148,163,184,0.12),0_1px_0_rgba(255,255,255,0.9)] [&_input]:outline-none [&_input]:transition [&_input]:focus:border-[#7f1324] [&_input]:focus:ring-2 [&_input]:focus:ring-[#f0cf88] [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border-2 [&_select]:border-[#d4a84f] [&_select]:bg-white [&_select]:px-4 [&_select]:text-base [&_select]:text-slate-900 [&_select]:shadow-[inset_0_2px_4px_rgba(148,163,184,0.12),0_1px_0_rgba(255,255,255,0.9)] [&_select]:outline-none [&_select]:transition [&_select]:focus:border-[#7f1324] [&_select]:focus:ring-2 [&_select]:focus:ring-[#f0cf88]";

const caseTypes = [
  {
    value: "accident",
    label: "อุบัติเหตุ",
    icon: Siren,
    desc: "อุบัติเหตุที่เกิดจากรถ",
  },
  {
    value: "emergency",
    label: "ผู้ป่วยฉุกเฉิน",
    icon: HeartPulse,
    desc: "ผู้ป่วยฉุกเฉินหรืออุบัติเหตุที่ไม่ได้เกิดจากรถ",
  },
  {
    value: "public_service",
    label: "บริการสาธารณะ",
    icon: Shield,
    desc: "ช่วยเหลือทั่วไป เช่น งูเข้าบ้าน พ่วงแบต ช่วยเหลือสัตว์",
  },
];

const accidentTypes = ["ด้วยตนเอง", "มีคู่กรณี"];
const vehicleTypes = [
  "รถจักรยานยนต์",
  "รถยนต์เก๋ง",
  "รถกระบะ",
  "รถตู้",
  "รถบรรทุก",
  "รถโดยสาร",
  "อื่นๆ",
];
const patientStatuses = ["บาดเจ็บ", "ป่วยฉุกเฉิน", "เสียชีวิต"];
const genders = ["ชาย", "หญิง", "อื่นๆ"];
const prefixes = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ.", "อื่นๆ"];
const destinations = ["โรงพยาบาล", "วัด", "บ้าน", "อื่นๆ"];
const tambons = [
  "หล่มสัก",
  "วัดป่า",
  "ตาลเดี่ยว",
  "ฝายนาแซง",
  "หนองสว่าง",
  "น้ำเฮี้ย",
  "สักหลง",
  "ท่าอิบุญ",
  "บ้านโสก",
  "บ้านติ้ว",
  "ห้วยไร่",
  "น้ำก้อ",
  "ปากช่อง",
  "น้ำชุน",
  "หนองไขว่",
  "ลานบ่า",
  "บุ่งคล้า",
  "บุ่งน้ำเต้า",
  "บ้านกลาง",
  "ช้างตะลูด",
  "บ้านไร่",
  "ปากดุก",
  "บ้านหวาย",
];
const provinces = [
  "เพชรบูรณ์",
  "พิษณุโลก",
  "เลย",
  "ขอนแก่น",
  "นครราชสีมา",
  "ลพบุรี",
  "สระบุรี",
  "กรุงเทพมหานคร",
  "อื่นๆ",
];
const colorOptions = [
  "ขาว",
  "ดำ",
  "แดง",
  "น้ำเงิน",
  "เทา",
  "เงิน",
  "เขียว",
  "เหลือง",
  "ส้ม",
  "น้ำตาล",
  "ทอง",
  "ชมพู",
  "ม่วง",
  "อื่นๆ",
];
const brandOptions = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "Toyota",
  "Isuzu",
  "Mitsubishi",
  "Mazda",
  "Nissan",
  "Ford",
  "Chevrolet",
  "MG",
  "BYD",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "BMW",
  "Volvo",
  "Hino",
  "Fuso",
  "Scania",
  "อื่นๆ",
];

function getNowParts() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}


function SummaryRow({ label, value }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-100 py-2 text-sm">
      <div className="font-semibold text-slate-500">{label}</div>
      <div className="break-words text-slate-900">{value || "-"}</div>
    </div>
  );
}

function SummaryCard({ title, children }) {
  return (
    <div className="rounded-[24px] border border-[#ead9b3]/55 bg-gradient-to-br from-[#fffdf9] to-[#f8f1de] p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(148,90,24,0.12)]">
      <div className="mb-3 text-base font-bold text-slate-900">{title}</div>
      {children}
    </div>
  );
}



function MapProStyle() {
  return (
    <style>{`
      @keyframes mapPinPulse {
        0% { transform: scale(0.9); opacity: 0.55; }
        70% { transform: scale(1.3); opacity: 0; }
        100% { transform: scale(1.3); opacity: 0; }
      }

      @keyframes mapPinFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-3px); }
      }

      .map-pro-pin {
        animation: mapPinFloat 1.8s ease-in-out infinite;
      }

      .map-pro-pin::before {
        content: "";
        position: absolute;
        inset: -9px;
        border-radius: 999px;
        border: 2px solid rgba(239, 68, 68, 0.48);
        animation: mapPinPulse 1.8s ease-out infinite;
      }
    `}</style>
  );
}

function SummaryBottomSheet({
  open,
  onClose,
  onConfirm,
  form,
  previewImages,
  submitting,
  editingIncidentId,
}) {
  if (!open) return null;

  const caseTypeLabel =
    caseTypes.find((x) => x.value === form.caseType)?.label || "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px]">
          <div className="sticky top-0 z-10 rounded-t-[30px] border-b border-[#ead9b3]/50 bg-gradient-to-r from-[#fffdf8] to-[#f7efdb]">
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-14 rounded-full bg-slate-300" />
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 bg-[#f7f1e7] pt-4">
              <div>
                <div className="text-lg font-black text-slate-900">
                  สรุปข้อมูลก่อนบันทึก
                </div>
                <div className="text-sm text-slate-500">
                  ตรวจสอบข้อมูลก่อนกดยืนยัน
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-gradient-to-b from-white to-slate-200 p-2 text-slate-600 shadow-[0_3px_0_#cbd5e1] active:translate-y-[1px] active:shadow-[0_1px_0_#cbd5e1]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-132px)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <SummaryCard title="ข้อมูลเคส">
              <SummaryRow
                label="วันที่"
                value={formatThaiDateShort(form.caseDate)}
              />
              <SummaryRow label="เวลา" value={form.caseTime} />
              <SummaryRow label="ประเภทเคส" value={caseTypeLabel} />
              <SummaryRow label="สถานที่เกิดเหตุ" value={form.place} />
              <SummaryRow label="ตำบล" value={form.tambon} />
              <SummaryRow label="ละติจูด" value={form.gpsLat} />
              <SummaryRow label="ลองจิจูด" value={form.gpsLng} />
              {form.caseType === "accident" && (
                <>
                  <SummaryRow
                    label="ลักษณะอุบัติเหตุ"
                    value={form.accidentType}
                  />
                  <SummaryRow label="รายละเอียด" value={form.accidentDetails} />
                </>
              )}
              {(form.caseType === "emergency" ||
                form.caseType === "public_service") && (
                  <SummaryRow label="รายละเอียด" value={form.accidentDetails} />
                )}
            </SummaryCard>

            {form.caseType === "accident" &&
              Array.isArray(form.vehicles) &&
              form.vehicles.length > 0 && (
                <SummaryCard title="ข้อมูลรถประสบเหตุ">
                  <div className="space-y-3">
                    {(form.vehicles || []).map((vehicle, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-[#ead9b3]/40 bg-white p-3"
                      >
                        <div className="mb-2 font-bold text-slate-900">
                          รถคันที่ {index + 1}
                        </div>
                        <SummaryRow label="ประเภทรถ" value={vehicle.type} />
                        <SummaryRow label="ยี่ห้อ" value={vehicle.brand} />
                        <SummaryRow label="รุ่น" value={vehicle.model} />
                        <SummaryRow label="สี" value={vehicle.color} />
                        <SummaryRow label="ทะเบียน" value={vehicle.plate} />
                        <SummaryRow label="จังหวัด" value={vehicle.province} />
                      </div>
                    ))}
                  </div>
                </SummaryCard>
              )}

            {(form.caseType === "accident" || form.caseType === "emergency") &&
              Array.isArray(form.patients) &&
              form.patients.length > 0 && (
                <SummaryCard title="ข้อมูลผู้ได้รับบาดเจ็บ / ผู้ป่วย">
                  <div className="space-y-3">
                    {(form.patients || []).map((patient, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-[#ead9b3]/40 bg-white p-3"
                      >
                        <div className="mb-2 font-bold text-slate-900">
                          รายที่ {index + 1}
                        </div>
                        <SummaryRow label="สถานะ" value={patient.status} />
                        <SummaryRow label="เพศ" value={patient.gender} />
                        <SummaryRow label="คำนำหน้า" value={patient.prefix} />
                        <SummaryRow
                          label="ชื่อ-นามสกุล"
                          value={patient.fullName}
                        />
                        <SummaryRow label="อายุ" value={patient.age} />
                        <SummaryRow label="อาการ" value={patient.symptoms} />
                        <SummaryRow
                          label="การช่วยเหลือ"
                          value={[
                            patient.aidFirstAid ? "ปฐมพยาบาลเบื้องต้น" : null,
                            patient.aidOxygen ? "ให้ออกซิเจน" : null,
                            patient.aidTransfer ? "นำส่ง / เคลื่อนย้าย" : null,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        />
                      </div>
                    ))}
                  </div>
                </SummaryCard>
              )}

            {(form.caseType === "accident" || form.caseType === "emergency") &&
              Array.isArray(form.patients) &&
              form.patients.length > 0 && (
                <SummaryCard title="การนำส่ง">
                  <SummaryRow label="ปลายทางที่ส่ง" value={form.destinationType} />
                  <SummaryRow label="ชื่อปลายทาง" value={form.destinationName} />
                </SummaryCard>
              )}

            <SummaryCard title="รูปภาพ">
              <SummaryRow
                label="รูปภาพ"
                value={
                  (previewImages || []).length
	    ? `${(previewImages || []).length} รูป`
	    : "0 รูป"
                }
              />
            </SummaryCard>
          </div>

          <div className="sticky bottom-0 rounded-t-3xl border-t border-[#ead9b3]/50 bg-gradient-to-r from-[#fffdf8] to-[#f7efdb] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#d4a84f] bg-gradient-to-b from-white to-[#efe3c7] px-5 py-3 text-sm font-bold text-slate-700 shadow-[0_5px_0_#d4a84f,0_10px_18px_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_2px_0_#d4a84f]"
              >
                <ChevronDown className="h-4 w-4" />
                กลับไปแก้ไข
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className={`${embossedRedButton} px-5 disabled:opacity-60`}
              >
                {submitting
                  ? "กำลังบันทึก..."
                  : editingIncidentId
                    ? "ยืนยันบันทึกการแก้ไข"
                    : "ยืนยันบันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IncidentFormPage({
  form,
  previewImages,
  currentPosition,
  cameraInputRef,
  attachInputRef,
  updateField,
  updateVehicle,
  updatePatient,
  addVehicle,
  addPatient,
  removeVehicle,
  removePatient,
  handleFiles,
  removeImage,
  setImageModal,
  getGPSFromMobile,
  updateMapLocation,
  handleSubmit,
  submitting,
  submitResult,
  editingIncidentId,
  cancelEditing,
  minimalMode = true,
  setMinimalMode,
}) {
  const [showSummarySheet, setShowSummarySheet] = useState(false);
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const mapWrapRef = useRef(null);

  const pinnedPosition = useMemo(() => {
    const lat = Number(form?.gpsLat ?? currentPosition?.lat);
    const lng = Number(form?.gpsLng ?? currentPosition?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
    return currentPosition && Number.isFinite(Number(currentPosition?.lat)) && Number.isFinite(Number(currentPosition?.lng))
      ? { lat: Number(currentPosition.lat), lng: Number(currentPosition.lng) }
      : null;
  }, [form?.gpsLat, form?.gpsLng, currentPosition]);

  const setNow = () => {
    const { date, time } = getNowParts();
    updateField("caseDate", date);
    updateField("caseTime", time);
  };

  const refocusMapToPin = () => {
    if (!pinnedPosition) return;
    setMapRenderKey((prev) => prev + 1);
    mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleLocateCurrentPosition = async () => {
    await Promise.resolve(getGPSFromMobile?.());
    window.setTimeout(() => {
      setMapRenderKey((prev) => prev + 1);
      mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  const removeVehicleFully = (index) => {
    const nextVehicles = Array.isArray(form.vehicles)
      ? form.vehicles.filter((_, i) => i !== index)
      : [];
    updateField("vehicles", nextVehicles);
  };

  const removePatientFully = (index) => {
    const nextPatients = Array.isArray(form.patients)
      ? form.patients.filter((_, i) => i !== index)
      : [];
    updateField("patients", nextPatients);
  };

  useEffect(() => {
    if (form.caseType === "public_service" && Array.isArray(form.patients) && form.patients.length) {
      updateField("patients", []);
    }
  }, [form.caseType]);

  useEffect(() => {
    if (pinnedPosition) {
      setMapRenderKey((prev) => prev + 1);
    }
  }, [pinnedPosition?.lat, pinnedPosition?.lng]);

  const openSummaryBeforeSubmit = (e) => {
    e.preventDefault();
    setShowSummarySheet(true);
  };

  const confirmSubmit = async () => {
    const fakeEvent = { preventDefault: () => { } };
    await handleSubmit(fakeEvent);
    setShowSummarySheet(false);
  };

  return (
    <>
      <form onSubmit={openSummaryBeforeSubmit} className="space-y-5">
        <div className="relative overflow-hidden rounded-[32px] border border-[#f3d37f]/45 bg-[linear-gradient(180deg,#d04a5d_0%,#b51f35_25%,#7c1021_68%,#4d0712_100%)] p-5 text-white shadow-[0_24px_50px_rgba(90,10,24,0.45),0_8px_0_rgba(70,8,18,0.95),inset_0_3px_0_rgba(255,255,255,0.32),inset_0_-12px_20px_rgba(40,5,12,0.35)]">
  <span className="pointer-events-none absolute inset-[1px] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_36%,transparent_60%)]" />
  <span className="pointer-events-none absolute left-6 top-0 h-14 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="mt-1 text-2xl font-black">{editingIncidentId ? "แก้ไขข้อมูลเคสจากฐานข้อมูล" : "ศูนย์บันทึกข้อมูลเคส"}</h2>
              <p className="mt-2 text-sm text-white/80">บันทึกข้อมูลและรายละเอียดเคสที่ออกปฏิบัติงาน</p>
            </div>
            </div>
  <span className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/18 blur-xl" />
        </div>

        <SectionShell
          title={editingIncidentId ? "รายละเอียดเคส" : "ข้อมูลเคส"}
          icon={ClipboardList}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label htmlFor="incident-case-date" className="mb-2 block text-sm font-bold text-slate-700">
                วันที่
              </label>
              <input
                id="incident-case-date"
                type="date"
                value={form.caseDate || ""}
                onChange={(e) => updateField("caseDate", e.target.value)}
                className="h-11 w-full rounded-2xl border-2 border-[#d4a84f] bg-white px-4 text-sm text-slate-900 shadow-[inset_0_2px_4px_rgba(148,163,184,0.12),0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-[#7f1324] focus:ring-2 focus:ring-[#f0cf88]"
              />
              <div className="mt-1 text-xs text-slate-500">
                พิมพ์ หรือ เลือกจากปฏิทิน
              </div>
            </div>

            <div>
              <label htmlFor="incident-case-time" className="mb-2 block text-sm font-bold text-slate-700">
                เวลา
              </label>
              <input
                id="incident-case-time"
                type="time"
                value={form.caseTime || ""}
                onChange={(e) => updateField("caseTime", e.target.value)}
                className="h-11 w-full rounded-2xl border-2 border-[#d4a84f] bg-white px-4 text-sm text-slate-900 shadow-[inset_0_2px_4px_rgba(148,163,184,0.12),0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-[#7f1324] focus:ring-2 focus:ring-[#f0cf88]"
              />
              <div className="mt-1 text-xs text-slate-500">
                พิมพ์หรือเลือกจากนาฬิกา
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={setNow}
                className={embossedBlueButton}
              >
                เวลานี้
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {caseTypes.map(({ value, label, icon: Icon, desc }) => {
              const active = form.caseType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField("caseType", value)}
                  className={`rounded-[24px] border p-4 text-left transition-all duration-150 active:translate-y-[2px] ${active
                      ? "border-[#f1d08b]/40 bg-gradient-to-b from-[#b11f33] to-[#6b1020] text-white shadow-[0_7px_0_#4a0b16,0_14px_28px_rgba(0,0,0,0.24)]"
                      : "border-[#d8c08a] bg-gradient-to-b from-white to-[#f7ecd2] shadow-[0_5px_0_#d4a84f,0_10px_22px_rgba(0,0,0,0.10)] hover:border-[#c79a3b]"
                    }`}
                >
                  <Icon className={`mb-3 h-6 w-6 ${active ? "text-[#ffe6a7]" : "text-[#7f1324]"}`} />
                  <div className={`font-bold ${active ? "text-white" : "text-slate-900"}`}>{label}</div>
                  <div className={`mt-1 text-sm ${active ? "text-white/80" : "text-slate-500"}`}>{desc}</div>
                </button>
              );
            })}
          </div>
        </SectionShell>

        <SectionShell
          title="ตำแหน่ง / สถานที่เกิดเหตุ / ข้อมูลอุบัติเหตุ"
          icon={MapPin}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={fieldShellClass}>
              <Input
                label="สถานที่เกิดเหตุ"
                value={form.place}
                onChange={(v) => updateField("place", v)}
              />
            </div>

            <div>
              <div className={fieldShellClass}>
                <Input
                  label="ตำบล"
                  value={form.tambon}
                  onChange={(v) => updateField("tambon", v)}
                  placeholder="กรอกข้อมูลหรือเลือกจากรายการ"
                  list="lomsak-tambons"
                />
              </div>
              <datalist id="lomsak-tambons">
                {tambons.map((tambon) => (
                  <option key={tambon} value={tambon} />
                ))}
              </datalist>
            </div>
          </div>

          {form.caseType === "accident" && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className={fieldShellClass}>
                <Select
                  label="ลักษณะอุบัติเหตุ"
                  value={form.accidentType}
                  onChange={(v) => updateField("accidentType", v)}
                  options={accidentTypes}
                />
              </div>
              <div className={fieldShellClass}>
                <Input
                  label="รายละเอียดอุบัติเหตุ"
                  value={form.accidentDetails}
                  onChange={(v) => updateField("accidentDetails", v)}
                />
              </div>
            </div>
          )}

          {(form.caseType === "emergency" ||
            form.caseType === "public_service") && (
              <div className="mt-4">
                <div className={fieldShellClass}>
                <Input
                  label="รายละเอียด"
                  value={form.accidentDetails}
                  onChange={(v) => updateField("accidentDetails", v)}
                  placeholder="เช่น จยย+กระบะ / ผู้ป่วยเป็นลม / พ่วงแบตเตอรี่"
                />
              </div>
              </div>
            )}

          <div
            ref={mapWrapRef}
            className="relative mt-2 h-[45vh] min-h-[350px] max-h-[600px] overflow-hidden rounded-[24px] border-2 border-[#d4a84f] bg-[#f8f4ea] shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_14px_32px_rgba(148,90,24,0.14)]"
          >
            <MapProStyle />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[350] bg-gradient-to-b from-[rgba(32,10,12,0.72)] via-[rgba(32,10,12,0.18)] to-transparent px-3 pb-10 pt-3 sm:px-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-[calc(100%-11rem)] rounded-[22px] border border-white/20 bg-white/92 px-3 py-2 text-slate-900 shadow-[0_10px_24px_rgba(0,0,0,0.16)] backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className="map-pro-pin relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#991b1b] text-white shadow-[0_10px_20px_rgba(220,38,38,0.35)]">
                      <MapPinned className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7f1324]">Map Pro UI</div>
                      <div className="truncate text-sm font-bold text-slate-900">
                        {form.place || "แตะบนแผนที่เพื่อปักหมุดตำแหน่งเหตุ"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#f7d892]/50 bg-[linear-gradient(180deg,rgba(103,15,28,0.96),rgba(58,8,15,0.96))] px-3 py-2 text-right text-white shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f7d892]">Live Map</div>
                  <div className="mt-0.5 text-xs font-semibold text-white/90">คลิกเพื่อปักหมุดได้ทันที</div>
                </div>
              </div>
            </div>
	
	<div className="absolute bottom-3 left-3 z-[450] right-3 flex flex-col gap-3 sm:right-auto sm:max-w-[165px]">
              <div className="pointer-events-none rounded-[20px] border border-white/55 bg-white/92 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(0,0,0,0.14)] backdrop-blur">
                แตะบนแผนที่เพื่อปักหมุด
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLocateCurrentPosition}
                  className={`${embossedBlueButton} flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-xs sm:text-sm`}
                >
                  <LocateFixed className="h-4 w-4" />
                  ตำแหน่งปัจจุบัน
                </button>
                <button
                  type="button"
                  onClick={refocusMapToPin}
                  disabled={!pinnedPosition}
                  className={`${embossedGoldButton} flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Navigation className="h-4 w-4" />
                  ไปยังหมุดที่ปัก
                </button>
              </div>
            </div>

            <div className="h-full min-h-[420px]">
              <MapPicker
                key={mapRenderKey}
                position={pinnedPosition || currentPosition}
                mapLabel=""
                onPick={updateMapLocation}
                incidents={[]}
              />
            </div>

            <div className="grid gap-2 border-t border-[#ead9b3]/70 bg-gradient-to-r from-[#fffaf0] via-[#fff5e4] to-[#f7efdb] px-4 py-3 text-xs font-medium text-slate-700 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7f1324] to-[#b11f33] text-white shadow-[0_8px_16px_rgba(127,19,36,0.24)]">
                  <Crosshair className="h-4 w-4" />
                </span>
                </div>
           </div>
          </div>
        </SectionShell>

        {form.caseType === "accident" && (
          <SectionShell title="ข้อมูลรถประสบเหตุ" icon={CarFront}>
            <div className="space-y-4">
              {(form.vehicles || []).map((vehicle, index) => (
                <div
                  key={index}
                  className="rounded-[26px] border border-[#ead9b3]/50 bg-gradient-to-r from-white to-[#faf5ea] p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(148,90,24,0.12)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      รายการรถคันที่ {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVehicleFully(index)}
                      className="rounded-xl bg-gradient-to-b from-rose-100 to-rose-200 px-3 py-2 text-xs font-bold text-red-700 shadow-[0_3px_0_#fda4af] active:translate-y-[1px] active:shadow-[0_1px_0_#fda4af]"
                    >
                      <Trash2 className="mr-1 inline h-4 w-4" />
                      ลบ
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className={fieldShellClass}>
                      <Select
                        label="ประเภทรถ"
                        value={vehicle.type}
                        onChange={(v) => updateVehicle(index, "type", v)}
                        options={vehicleTypes}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Select
                        label="ยี่ห้อรถ"
                        value={vehicle.brand}
                        onChange={(v) => updateVehicle(index, "brand", v)}
                        options={brandOptions}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Input
                        label="รุ่นรถ"
                        value={vehicle.model}
                        onChange={(v) => updateVehicle(index, "model", v)}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Select
                        label="สีรถ"
                        value={vehicle.color}
                        onChange={(v) => updateVehicle(index, "color", v)}
                        options={colorOptions}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Input
                        label="ทะเบียนรถ"
                        value={vehicle.plate}
                        onChange={(v) => updateVehicle(index, "plate", v)}
                      />
                    </div>

                    <div>
                      <div className={fieldShellClass}>
                        <Input
                          label="จังหวัด"
                          value={vehicle.province}
                          onChange={(v) => updateVehicle(index, "province", v)}
                          placeholder="กรอกข้อมูลหรือเลือกจากรายการ"
                          list={`vehicle-provinces-${index}`}
                        />
                      </div>
                      <datalist id={`vehicle-provinces-${index}`}>
                        {provinces.map((province) => (
                          <option key={province} value={province} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVehicle}
                className={embossedDarkButton}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                เพิ่มรายการข้อมูลรถ
              </button>
            </div>
          </SectionShell>
        )}

        {(form.caseType === "accident" || form.caseType === "emergency") && (
          <SectionShell
            title="ข้อมูลผู้ได้รับบาดเจ็บ / ผู้ป่วย"
            icon={HeartPulse}
          >
            <div className="space-y-4">
              {(form.patients || []).map((patient, index) => (
                <div
                  key={index}
                  className="rounded-[26px] border border-[#ead9b3]/50 bg-gradient-to-r from-white to-[#faf5ea] p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(148,90,24,0.12)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      รายที่ {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePatientFully(index)}
                      className="rounded-xl bg-gradient-to-b from-rose-100 to-rose-200 px-3 py-2 text-xs font-bold text-red-700 shadow-[0_3px_0_#fda4af] active:translate-y-[1px] active:shadow-[0_1px_0_#fda4af]"
                    >
                      <Trash2 className="mr-1 inline h-4 w-4" />
                      ลบ
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className={fieldShellClass}>
                      <Select
                        label="สถานะ"
                        value={patient.status}
                        onChange={(v) => updatePatient(index, "status", v)}
                        options={patientStatuses}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Select
                        label="เพศ"
                        value={patient.gender}
                        onChange={(v) => updatePatient(index, "gender", v)}
                        options={genders}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Select
                        label="คำนำหน้า"
                        value={patient.prefix}
                        onChange={(v) => updatePatient(index, "prefix", v)}
                        options={prefixes}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Input
                        label="ชื่อ-นามสกุล"
                        value={patient.fullName}
                        onChange={(v) => updatePatient(index, "fullName", v)}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Input
                        label="อายุ"
                        value={patient.age}
                        onChange={(v) => updatePatient(index, "age", v)}
                      />
                    </div>
                    <div className={fieldShellClass}>
                      <Input
                        label="อาการ/รายละเอียด"
                        value={patient.symptoms}
                        onChange={(v) => updatePatient(index, "symptoms", v)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="flex items-center gap-2 rounded-2xl border-2 border-[#d4a84f] bg-gradient-to-b from-white to-[#f9f3e6] px-4 py-3 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(148,90,24,0.10)]">
                      <input
                        type="checkbox"
                        checked={!!patient.aidFirstAid}
                        onChange={(e) =>
                          updatePatient(index, "aidFirstAid", e.target.checked)
                        }
                      />
                      ปฐมพยาบาลเบื้องต้น
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border-2 border-[#d4a84f] bg-gradient-to-b from-white to-[#f9f3e6] px-4 py-3 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(148,90,24,0.10)]">
                      <input
                        type="checkbox"
                        checked={!!patient.aidOxygen}
                        onChange={(e) =>
                          updatePatient(index, "aidOxygen", e.target.checked)
                        }
                      />
                      ให้ออกซิเจน
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border-2 border-[#d4a84f] bg-gradient-to-b from-white to-[#f9f3e6] px-4 py-3 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(148,90,24,0.10)]">
                      <input
                        type="checkbox"
                        checked={!!patient.aidTransfer}
                        onChange={(e) =>
                          updatePatient(index, "aidTransfer", e.target.checked)
                        }
                      />
                      นำส่ง / เคลื่อนย้าย
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPatient}
                className={embossedDarkButton}
              >
                <Plus className="mr-1 inline h-4 w-4" />
                เพิ่มรายการข้อมูลผู้ป่วย
              </button>
            </div>
          </SectionShell>
        )}

        {(form.caseType === "accident" || form.caseType === "emergency") &&
          Array.isArray(form.patients) &&
          form.patients.length > 0 && (
            <SectionShell title="การนำส่ง" icon={Navigation}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={fieldShellClass}>
                  <Select
                    label="สถานที่นำส่ง"
                    value={form.destinationType}
                    onChange={(v) => updateField("destinationType", v)}
                    options={destinations}
                  />
                </div>
                <div className={fieldShellClass}>
                  <Input
                    label="ชื่อสถานที่"
                    value={form.destinationName}
                    onChange={(v) => updateField("destinationName", v)}
                  />
                </div>
              </div>
            </SectionShell>
          )}

       <SectionShell title="รูปภาพ" icon={Camera}>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={embossedRedButton}
            >
              <Camera className="mr-1 inline h-4 w-4" />
              ถ่ายรูป
            </button>
            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              className={embossedDarkButton}
            >
              <Upload className="mr-1 inline h-4 w-4" />
              อัปโหลดรูป
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              aria-label="ถ่ายรูปประกอบเคส"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*"
              aria-label="อัปโหลดรูปประกอบเคส"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(previewImages || []).map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="overflow-hidden rounded-[24px] border-2 border-[#d4a84f] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(148,90,24,0.12)]"
              >
                <button
                  type="button"
                  onClick={() => setImageModal(item.url)}
                  className="block w-full"
                >
                  <img
                    src={item.url}
                    alt={`preview-${index}`}
                    className="aspect-[4/3] h-auto w-full object-cover"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 truncate text-xs text-slate-500">
                    {item.file?.name || `รูปที่ ${index + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded-xl bg-gradient-to-b from-rose-100 to-rose-200 px-3 py-2 text-xs font-bold text-red-700 shadow-[0_3px_0_#fda4af] active:translate-y-[1px] active:shadow-[0_1px_0_#fda4af]"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
            {!(previewImages || []).length && (
              <div className="rounded-[24px] border-2 border-dashed border-[#d4a84f] bg-gradient-to-br from-[#fffaf0] to-[#faf4e7] p-6 text-center text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                ยังไม่มีรูปภาพแนบ
              </div>
            )}
          </div>
        </SectionShell>

        <SectionShell title="ผู้สรุปรายงาน" icon={FileText}>
          <div className="max-w-md">
            <div className={fieldShellClass}>
              <Input
                label="ผู้สรุปรายงาน"
                value={form.reporterName}
                onChange={() => { }}
                disabled
              />
            </div>
          </div>
        </SectionShell>

        <div className="flex flex-wrap gap-3">
          <button
            id="incident-form-submit-btn"
            type="submit"
            disabled={submitting}
            className={`${embossedRedButton} px-5 disabled:opacity-60`}
          >
            {submitting
              ? "กำลังบันทึก..."
              : editingIncidentId
                ? "บันทึกการแก้ไข"
                : "บันทึกข้อมูล"}
          </button>

          {editingIncidentId && (
            <button
              type="button"
              onClick={cancelEditing}
              className={`${embossedGoldButton} border border-[#c79a3b]/30 px-5 text-white`}
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        {submitResult && !submitResult.ok && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {submitResult.message}
          </div>
        )}
      </form>

      <SummaryBottomSheet
        open={showSummarySheet}
        onClose={() => setShowSummarySheet(false)}
        onConfirm={confirmSubmit}
        form={form}
        previewImages={previewImages}
        submitting={submitting}
        editingIncidentId={editingIncidentId}
      />
    </>
  );
}
