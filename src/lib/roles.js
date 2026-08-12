export const ROLE_OPTIONS = [
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "boss", label: "ผู้บริหาร" },
  { value: "station", label: "พนักงาน" },
  { value: "volunteer", label: "อาสาสมัคร" },
  { value: "user", label: "รออนุมัติ / ปิดการใช้งาน" },
];

export const RESCUE_PERSONNEL_ROLES = ["admin", "boss", "station", "volunteer"];

export function getRoleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || "ผู้ใช้งาน";
}

export function isRescuePersonnel(profile) {
  if (!profile) return false;
  return profile.is_active !== false && RESCUE_PERSONNEL_ROLES.includes(profile.role);
}
