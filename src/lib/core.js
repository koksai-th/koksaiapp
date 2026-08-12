import {
  BellRing,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  Siren,
  UsersRound,
} from "lucide-react";

export const HQ_THAI_NAME = "หน่วยกู้ภัยกกไทร สำนักงานใหญ่";
export const HQ_ENG_NAME = "KOKSAI RESCUE ASSOCIATION HEADQUARTERS";
export const STORAGE_BUCKET = "incident-photos";

export const TABS = [
  {
    key: "dashboard",
    label: "ศูนย์ข้อมูลสถิติเคส",
    description: "ภาพรวมสถิติเคสที่ออกปฏิบัติงาน",
    icon: LayoutDashboard,
  },
  {
    key: "personnel",
    label: "บุคลากร",
    description: "ทำเนียบบุคลากรกู้ภัยกกไทร",
    icon: UsersRound,
  },
  {
    key: "form",
    label: "ศูนย์บันทึกข้อมูล",
    description: "บันทึกข้อมูลและรายละเอียดเคสที่ออกปฏิบัติงาน",
    icon: ClipboardList,
  },
  {
    key: "command",
    label: "ศูนย์แจ้งเหตุ",
    description: "แจ้งเหตุแบบเรียลไทม์",
    icon: Siren,
  },
  {
    key: "notifications",
    label: "กล่องแจ้งเตือน",
    description: "รายการแจ้งเตือน",
    icon: BellRing,
  },
  {
    key: "report",
    label: "ศูนย์สรุปข้อมูลเคส",
    description: "สรุปข้อมูลเคส",
    icon: FileDown,
  },
];

export const emptyVehicle = () => ({
  type: "",
  brand: "",
  model: "",
  color: "",
  plate: "",
  province: "",
});

export const emptyPatient = () => ({
  status: "",
  gender: "",
  prefix: "",
  fullName: "",
  age: "",
  symptoms: "",
  aidFirstAid: false,
  aidOxygen: false,
  aidTransfer: false,
});

export const pad = (n, len = 2) => String(n).padStart(len, "0");

export const getCurrentYear = () => new Date().getFullYear();

export const getCurrentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const getCurrentTime = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const getMonthKey = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const parseGps = (gps) => {
  if (!gps) return null;
  const parts = String(gps)
    .split(",")
    .map((s) => s.trim());

  if (parts.length !== 2) return null;

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

export const getDefaultCenter = () => [16.779889, 101.242778];

export const getCaseId = () => `KS-${getCurrentYear()}-${String(Date.now()).slice(-6)}`;

export const createInitialForm = () => ({
  caseId: getCaseId(),
  caseDate: getCurrentDate(),
  caseTime: getCurrentTime(),
  caseType: "",
  place: "",
  tambon: "",
  gps: "",
  accidentType: "",
  accidentDetails: "",
  vehicles: [emptyVehicle()],
  patients: [emptyPatient()],
  destinationType: "",
  destinationName: "",
  reporterName: "",
  reporterPhone: "",
  details: "",
  status: "open",
  images: [],
});

export const createAlertDraft = () => ({
  caseId: "",
  caseDate: getCurrentDate(),
  caseTime: getCurrentTime(),
  caseType: "",
  place: "",
  tambon: "",
  gps: "",
});

export const buildAlertMessage = (row) => {
  const lat = row?.gps_lat;
  const lng = row?.gps_lng;

  const hasCoordinates =
    lat !== null &&
    lat !== undefined &&
    lat !== "" &&
    lng !== null &&
    lng !== undefined &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  const mapsLink = hasCoordinates
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : row?.gps_text || "-";

  const getCaseTypeLabel = (type) => {
    if (type === "accident") return "อุบัติเหตุ";
    if (type === "emergency") return "ผู้ป่วยฉุกเฉิน";
    if (type === "public_service") return "บริการสาธารณะ";
    return "-";
  };

  return [
    "🚑 แจ้งเหตุ หน่วยกู้ภัยกกไทร",
    `เลขเคส ${row?.case_id || "-"}`,
    `วันที่ ${row?.incident_date || "-"}`,
    `เวลา ${row?.incident_time ? String(row.incident_time).slice(0, 5) : "-"}`,
    `ประเภท ${getCaseTypeLabel(row?.case_type)}`,
    `สถานที่เกิดเหตุ ${row?.place || row?.location_text || "-"}`,
    `ตำบล ${row?.tambon || "-"}`,
    `รายละเอียด ${row?.accident_details || row?.details || "-"}`,
    `Google Maps ${mapsLink}`,
  ].join("\n");
};