/* ReportPage_3D_responsive_fixed.jsx
ปรับ: Header 3D responsive + ปุ่มเมนูรองรับมือถือ
*/

import React, { useMemo, useState } from "react";
import {
  CheckSquare,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Square,
} from "lucide-react";
import { formatThaiDate } from "../lib/dateUtils";

const button3DBase =
  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm transition-all duration-150 active:translate-y-[2px]";

export default function ReportPage({
  incidents = [],
  selectedReportIds = [],
  setSelectedReportIds,
  reportRows = [],
  reportType = "single_case",
  setReportType,
  printPdf,
  onEditIncident,
}) {
  const safeIncidents = Array.isArray(incidents) ? incidents : [];
  const safeSelectedIds = Array.isArray(selectedReportIds) ? selectedReportIds : [];
  const safeRows = Array.isArray(reportRows) ? reportRows : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(50);

  const sortedRows = useMemo(() => {
    return [...safeIncidents].sort((a, b) => {
      const aDate = `${a?.incident_date || ""} ${a?.incident_time || ""}`.trim();
      const bDate = `${b?.incident_date || ""} ${b?.incident_time || ""}`.trim();
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [safeIncidents]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("th-TH");
    if (!query) return sortedRows;

    return sortedRows.filter((row) =>
      [
        row?.case_id,
        row?.place,
        row?.location_text,
        row?.tambon,
        row?.incident_date,
        row?.incident_time,
        labelCaseType(row?.case_type),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("th-TH").includes(query)),
    );
  }, [searchTerm, sortedRows]);

  const visibleRows = filteredRows.slice(0, visibleLimit);
  const allSelected =
    filteredRows.length > 0 && filteredRows.every((row) => safeSelectedIds.includes(row.id));

  const totalSummary = useMemo(() => {
    const result = {
      total: safeRows.length,
      accident: 0,
      emergency: 0,
      public_service: 0,
      injured: 0,
      emergencyPatients: 0,
      deceased: 0,
    };

    for (const row of safeRows) {
      if (row?.case_type === "accident") result.accident += 1;
      if (row?.case_type === "emergency") result.emergency += 1;
      if (row?.case_type === "public_service") result.public_service += 1;
      if (Array.isArray(row?.patients_json)) {
        for (const p of row.patients_json) {
          if (p?.status === "บาดเจ็บ") result.injured += 1;
          if (p?.status === "ป่วยฉุกเฉิน") result.emergencyPatients += 1;
          if (p?.status === "เสียชีวิต") result.deceased += 1;
        }
      }
    }
    return result;
  }, [safeRows]);

  const toggleSelection = (id) => {
    if (typeof setSelectedReportIds !== "function") return;
    setSelectedReportIds((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.includes(id) ? safePrev.filter((x) => x !== id) : [...safePrev, id];
    });
  };

  const toggleSelectAll = () => {
    if (typeof setSelectedReportIds !== "function") return;
    if (allSelected) return setSelectedReportIds([]);
    setSelectedReportIds(filteredRows.map((row) => row.id));
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] border border-[#f3d37f]/45 bg-[linear-gradient(180deg,#b51f35_0%,#99172b_38%,#7c1021_68%,#5f0b18_100%)] p-5 text-white shadow-[0_22px_40px_rgba(90,10,24,0.34),0_8px_0_rgba(92,10,24,0.95),inset_0_2px_0_rgba(255,255,255,0.28),inset_0_-10px_18px_rgba(50,6,14,0.28)]">
  <span className="pointer-events-none absolute inset-[1px] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_36%,transparent_60%)]" />
  <span className="pointer-events-none absolute left-6 top-0 h-14 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mt-1 text-2xl font-black">ศูนย์สรุปและส่งออกข้อมูลเคส</h2>
            <p className="mt-2 text-sm text-white/80">สรุปข้อมูลเคส ส่งออกไฟล์ข้อมูลเคส และพิมพ์ข้อมูลเคส</p>
          </div>
          
  <span className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/18 blur-xl" />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-br from-white to-[#fbf5e9] p-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(88,54,16,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`${button3DBase} border-2 border-[#d5b15c] bg-gradient-to-b from-white to-[#f6ebd2] text-slate-700 shadow-[0_5px_0_#dbc28e,0_10px_22px_rgba(123,92,33,0.14)] hover:brightness-[1.02] active:shadow-[0_2px_0_#dbc28e,0_6px_14px_rgba(123,92,33,0.12)]`}
            >
              {allSelected ? <CheckSquare className="h-4 w-4 text-[#7f1324]" /> : <Square className="h-4 w-4 text-[#7f1324]" />} {allSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
            </button>
            <div className="rounded-2xl border-2 border-[#d9b86a] bg-gradient-to-b from-[#fff9eb] to-[#f7e7bb] px-4 py-2.5 text-sm font-bold text-[#7f1324] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_16px_rgba(127,19,36,0.10)]">
              เลือกแล้ว {safeSelectedIds.length} เคส
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReportType?.("single_case")}
              className={`${button3DBase} ${
                reportType === "single_case"
                  ? "border border-[#8f1830] bg-gradient-to-b from-[#b32037] to-[#7f1324] text-white shadow-[0_5px_0_#5c0d1a,0_12px_24px_rgba(127,19,36,0.24)] active:shadow-[0_2px_0_#5c0d1a,0_8px_16px_rgba(127,19,36,0.2)]"
                  : "border-2 border-[#d5b15c] bg-gradient-to-b from-white to-[#f6ebd2] text-slate-700 shadow-[0_5px_0_#dbc28e,0_10px_22px_rgba(123,92,33,0.14)] active:shadow-[0_2px_0_#dbc28e,0_6px_14px_rgba(123,92,33,0.12)]"
              }`}
            >
              <FileText className="h-4 w-4" /> รายเคส
            </button>
            <button
              type="button"
              onClick={() => setReportType?.("summary")}
              className={`${button3DBase} ${
                reportType === "summary"
                  ? "border border-[#8f1830] bg-gradient-to-b from-[#b32037] to-[#7f1324] text-white shadow-[0_5px_0_#5c0d1a,0_12px_24px_rgba(127,19,36,0.24)] active:shadow-[0_2px_0_#5c0d1a,0_8px_16px_rgba(127,19,36,0.2)]"
                  : "border-2 border-[#d5b15c] bg-gradient-to-b from-white to-[#f6ebd2] text-slate-700 shadow-[0_5px_0_#dbc28e,0_10px_22px_rgba(123,92,33,0.14)] active:shadow-[0_2px_0_#dbc28e,0_6px_14px_rgba(123,92,33,0.12)]"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> สรุปรวม
            </button>
          </div>
          <button
            type="button"
            onClick={printPdf}
            className={`${button3DBase} border border-[#f0cf88]/30 bg-gradient-to-b from-[#d5394f] via-[#9d1b2f] to-[#6f1020] text-white shadow-[0_6px_0_#4f0a16,0_14px_28px_rgba(0,0,0,0.25)] hover:brightness-110 active:shadow-[0_3px_0_#4f0a16,0_8px_16px_rgba(0,0,0,0.22)]`}
          >
            <Printer className="h-4 w-4 text-[#f0cf88]" /> พิมพ์/PDF
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <section className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-br from-white to-[#fffaf1] p-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(88,54,16,0.10)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#7f1324]" />
              <h3 className="text-lg font-black text-slate-900">รายการเคสทั้งหมด</h3>
            </div>
            <span className="rounded-full bg-[#7f1324]/10 px-3 py-1 text-xs font-black text-[#7f1324]">
              พบ {filteredRows.length.toLocaleString("th-TH")} เคส
            </span>
          </div>

          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-2xl border-2 border-[#d8bd84] bg-white px-4 shadow-inner focus-within:border-[#9f1c31] focus-within:ring-4 focus-within:ring-[#9f1c31]/10">
            <Search className="h-5 w-5 shrink-0 text-[#7f1324]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setVisibleLimit(50);
              }}
              placeholder="ค้นหาเลขเคส สถานที่ ตำบล วันที่..."
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="mt-4 space-y-3">
            {filteredRows.length === 0 ? (
              <EmptyBox text={searchTerm ? "ไม่พบเคสที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลเคส"} />
            ) : (
              visibleRows.map((row) => {
                const checked = safeSelectedIds.includes(row.id);
                return (
                  <div
                    key={row.id}
                    className={`rounded-[24px] border-2 p-4 transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(88,54,16,0.08)] ${
                      checked
                        ? "border-[#b32037] bg-gradient-to-br from-[#fff3f5] to-[#fde4e9]"
                        : "border-[#ddc28d] bg-gradient-to-r from-white to-[#faf5ea] hover:border-[#d4a84f]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button type="button" onClick={() => toggleSelection(row.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                        <span className="mt-0.5">{checked ? <CheckSquare className="h-5 w-5 text-[#7f1324]" /> : <Square className="h-5 w-5 text-[#b49a63]" />}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-slate-900">{row.case_id || "ไม่ระบุเลขเคส"}</span>
                          <span className="mt-1 block text-sm text-slate-600">{labelCaseType(row.case_type)}</span>
                          <span className="mt-1 block text-sm text-slate-500">{row.place || row.location_text || "-"}</span>
                          <span className="mt-1 block text-xs text-slate-500">{formatThaiDate(row.incident_date)} {row.incident_time || ""}</span>
                        </span>
                      </button>

                      {typeof onEditIncident === "function" ? (
                        <button
                          type="button"
                          onClick={() => onEditIncident(row)}
                          className="rounded-xl border-2 border-[#e0b354] bg-gradient-to-b from-[#fff5cc] to-[#f0c96a] px-3 py-2 text-xs font-bold text-[#7f1324] shadow-[0_4px_0_#cb9b2e,0_8px_16px_rgba(203,155,46,0.2)] transition-all active:translate-y-[2px] active:shadow-[0_2px_0_#cb9b2e,0_5px_10px_rgba(203,155,46,0.18)]"
                        >
                          แก้ไข
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}

            {visibleRows.length < filteredRows.length ? (
              <button
                type="button"
                onClick={() => setVisibleLimit((current) => current + 50)}
                className="mt-4 min-h-12 w-full rounded-2xl border-2 border-[#d5b15c] bg-gradient-to-b from-white to-[#f6ebd2] px-4 py-3 text-sm font-black text-[#7f1324] shadow-[0_4px_0_#dbc28e] transition active:translate-y-[2px] active:shadow-[0_2px_0_#dbc28e]"
              >
                แสดงเพิ่มอีก {Math.min(50, filteredRows.length - visibleRows.length).toLocaleString("th-TH")} เคส
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#ead9b3]/70 bg-gradient-to-br from-white to-[#fffaf1] p-5 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_12px_26px_rgba(88,54,16,0.10)]">
          <h3 className="text-lg font-black text-slate-900">{reportType === "summary" ? "สรุปรายงานรวม" : "ตัวอย่างรายงานรายเคส"}</h3>

          {safeRows.length === 0 ? (
            <div className="mt-4"><EmptyBox text="เลือกเคสจากรายการด้านซ้ายก่อน" /></div>
          ) : reportType === "summary" ? (
            <div className="mt-4 space-y-4">
              <SummaryCard label="จำนวนเคสทั้งหมด" value={totalSummary.total} />
              <SummaryCard label="อุบัติเหตุ" value={totalSummary.accident} />
              <SummaryCard label="ผู้ป่วยฉุกเฉิน" value={totalSummary.emergency} />
              <SummaryCard label="บริการสาธารณะ" value={totalSummary.public_service} />
              <SummaryCard label="ผู้บาดเจ็บ" value={totalSummary.injured} />
              <SummaryCard label="ผู้ป่วยฉุกเฉิน (คน)" value={totalSummary.emergencyPatients} />
              <SummaryCard label="เสียชีวิต" value={totalSummary.deceased} />
              <div className="rounded-[24px] border-2 border-[#d8b667] bg-gradient-to-br from-[#fffaf0] to-[#f8efd8] p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(88,54,16,0.08)]">
                <div className="text-sm font-bold text-slate-800">เลขเคสที่เลือก</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {safeRows.map((row) => (
                    <span key={row.id} className="rounded-xl border-2 border-[#e4c57d] bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">{row.case_id || "-"}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {safeRows.map((row, index) => (
                <div key={row.id || index} className="rounded-[24px] border-2 border-[#d8b667] bg-gradient-to-r from-white to-[#faf5ea] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(88,54,16,0.08)]">
                  <div className="text-sm font-black text-slate-900">{row.case_id || "-"}</div>
                  <div className="mt-1 text-sm text-slate-600">{labelCaseType(row.case_type)}</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <DetailRow label="วันที่" value={`${formatThaiDate(row.incident_date)} ${row.incident_time || ""}`} />
                    <DetailRow label="สถานที่" value={row.place || row.location_text || "-"} />
                    <DetailRow label="ตำบล" value={row.tambon || "-"} />
                    <DetailRow label="รายละเอียด" value={row.accident_details || row.details || "-"} />
                    <DetailRow label="ผู้สรุปรายงาน" value={row.reporter_name || row.reporterName || "-"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return <div className="rounded-[24px] border-2 border-dashed border-[#ddc690] bg-gradient-to-br from-[#fffaf0] to-[#faf4e7] px-5 py-8 text-center text-sm font-medium text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.95)]">{text}</div>;
}

function SummaryCard({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-[#d8b667] bg-gradient-to-r from-white to-[#faf5ea] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(88,54,16,0.08)]">
      <div className="text-sm font-bold text-slate-700">{label}</div>
      <div className="text-lg font-black text-[#7f1324]">{Number(value || 0).toLocaleString("th-TH")}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-[#eadcc0] py-2 last:border-b-0">
      <div className="font-semibold text-slate-500">{label}</div>
      <div className="break-words rounded-xl border-2 border-[#e4c57d] bg-white px-3 py-2 text-slate-900 shadow-inner">{value || "-"}</div>
    </div>
  );
}

function labelCaseType(type) {
  if (type === "accident") return "อุบัติเหตุ 🚗";
  if (type === "emergency") return "ผู้ป่วยฉุกเฉิน 🚑";
  if (type === "public_service") return "บริการสาธารณะ 🛠️";
  return "-";
}
