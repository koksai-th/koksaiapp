import React, { useEffect, useMemo, useState } from "react";
import {
  Ambulance,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteAdminRow,
  loadAdminRows,
  saveAdminRow,
} from "../lib/adminResources";

const EMPTY_FORM = {
  vehicle_code: "",
  name: "",
  plate_number: "",
  province: "",
  brand: "",
  model: "",
  station: "all",
  status: "ready",
  image_url: "",
  notes: "",
  sort_order: 9999,
  is_active: true,
};

const STATUS_OPTIONS = [
  { value: "ready", label: "พร้อมใช้งาน" },
  { value: "on_duty", label: "กำลังปฏิบัติงาน" },
  { value: "maintenance", label: "ซ่อมบำรุง" },
  { value: "inactive", label: "งดใช้งาน" },
];

const STATUS_STYLES = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  on_duty: "border-[#dac17e] bg-[#fff8df] text-[#6d4610]",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-600",
};

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || "-";
}

function normalizeForm(row = {}) {
  return {
    ...EMPTY_FORM,
    ...row,
    sort_order: Number(row.sort_order ?? 9999),
    is_active: row.is_active !== false,
  };
}

export default function AmbulancesAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState(null);

  const loadRows = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadAdminRows("ambulances", {
        orderBy: "sort_order",
        ascending: true,
      });
      setRows(data);
    } catch (loadError) {
      setError(
        loadError?.message ||
          "โหลดข้อมูลรถพยาบาลไม่สำเร็จ กรุณาตรวจสอบ migration และสิทธิ์ RLS",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = keyword.trim().toLocaleLowerCase("th");
    if (!search) return rows;
    return rows.filter((row) =>
      [
        row.vehicle_code,
        row.name,
        row.plate_number,
        row.province,
        row.brand,
        row.model,
        row.station,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(search),
    );
  }, [keyword, rows]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form?.vehicle_code.trim() || !form?.name.trim()) {
      setError("กรุณากรอกรหัสรถและชื่อรถ");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveAdminRow("ambulances", {
        ...form,
        vehicle_code: form.vehicle_code.trim(),
        name: form.name.trim(),
        plate_number: form.plate_number.trim() || null,
        province: form.province.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        station: form.station.trim() || "all",
        image_url: form.image_url.trim() || null,
        notes: form.notes.trim() || null,
        sort_order: Number(form.sort_order || 9999),
      });
      setForm(null);
      await loadRows();
    } catch (saveError) {
      setError(saveError?.message || "บันทึกข้อมูลรถพยาบาลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const confirmed = window.confirm(`ต้องการลบรถ ${row.name || row.vehicle_code} ใช่หรือไม่?`);
    if (!confirmed) return;

    setError("");
    try {
      await deleteAdminRow("ambulances", row.id);
      await loadRows();
    } catch (deleteError) {
      setError(deleteError?.message || "ลบข้อมูลรถพยาบาลไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-[#f3d37f]/50 bg-[linear-gradient(180deg,#b51f35_0%,#99172b_40%,#6f1020_100%)] p-5 text-white shadow-[0_22px_40px_rgba(90,10,24,0.35),0_8px_0_rgba(92,10,24,0.95),inset_0_2px_0_rgba(255,255,255,0.28)]">
        <span className="pointer-events-none absolute inset-[1px] rounded-[27px] bg-[linear-gradient(180deg,rgba(255,255,255,.15),transparent_45%)]" />
        <span className="pointer-events-none absolute left-8 top-0 h-16 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xl font-black text-white drop-shadow-[0_3px_3px_rgba(0,0,0,.35)]">
              <Ambulance className="h-6 w-6 text-[#7f1324]" /> ทะเบียนรถพยาบาล
            </div>
            <p className="mt-1 text-sm text-white/80">เพิ่ม แก้ไข สถานะ และหน่วยประจำรถ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
            </button>
            <button
              type="button"
              onClick={() => setForm(normalizeForm())}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#7f1324] px-4 text-sm font-black text-white hover:bg-[#99192c]"
            >
              <Plus className="h-4 w-4" /> เพิ่มรถ
            </button>
          </div>
        </div>
      </section>

      <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 shadow-sm focus-within:border-[#7f1324] focus-within:ring-4 focus-within:ring-rose-100">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="ค้นหารหัสรถ ชื่อรถ ทะเบียน หรือหน่วย"
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none"
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-10 text-center text-sm font-bold text-slate-500">
          กำลังโหลดข้อมูลรถพยาบาล...
        </div>
      ) : null}

      {!loading && !filteredRows.length ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
          <Ambulance className="mx-auto h-10 w-10 text-slate-300" />
          <div className="mt-3 font-black text-slate-700">ยังไม่มีข้อมูลรถพยาบาล</div>
          <div className="mt-1 text-sm text-slate-500">กด “เพิ่มรถ” เพื่อสร้างรายการแรก</div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredRows.map((row) => (
          <article key={row.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rose-50 text-[#7f1324]">
                {row.image_url ? (
                  <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" />
                ) : (
                  <Ambulance className="h-9 w-9" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-black text-slate-900">{row.name}</div>
                    <div className="text-xs font-bold text-[#7f1324]">รหัสรถ {row.vehicle_code}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${STATUS_STYLES[row.status] || STATUS_STYLES.inactive}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-[86px_1fr] gap-x-2 gap-y-1 text-sm">
                  <dt className="font-bold text-slate-500">ทะเบียน</dt>
                  <dd className="font-medium text-slate-800">{[row.plate_number, row.province].filter(Boolean).join(" ") || "-"}</dd>
                  <dt className="font-bold text-slate-500">รุ่น</dt>
                  <dd className="font-medium text-slate-800">{[row.brand, row.model].filter(Boolean).join(" ") || "-"}</dd>
                  <dt className="font-bold text-slate-500">หน่วย</dt>
                  <dd className="font-medium text-slate-800">{row.station || "ทุกพื้นที่"}</dd>
                </dl>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${row.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {row.is_active ? "แสดงในระบบ" : "ซ่อนจากระบบ"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(normalizeForm(row))}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 hover:bg-slate-200"
                >
                  <Edit3 className="h-3.5 w-3.5" /> แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> ลบ
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {form ? (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-black text-slate-900">{form.id ? "แก้ไขรถพยาบาล" : "เพิ่มรถพยาบาล"}</div>
              <button type="button" onClick={() => setForm(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="รหัสรถ *">
                <input value={form.vehicle_code} onChange={(event) => updateForm("vehicle_code", event.target.value)} className="input-admin" />
              </Field>
              <Field label="ชื่อรถ *">
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="input-admin" />
              </Field>
              <Field label="ทะเบียน">
                <input value={form.plate_number} onChange={(event) => updateForm("plate_number", event.target.value)} className="input-admin" />
              </Field>
              <Field label="จังหวัด">
                <input value={form.province} onChange={(event) => updateForm("province", event.target.value)} className="input-admin" />
              </Field>
              <Field label="ยี่ห้อ">
                <input value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} className="input-admin" />
              </Field>
              <Field label="รุ่น">
                <input value={form.model} onChange={(event) => updateForm("model", event.target.value)} className="input-admin" />
              </Field>
              <Field label="หน่วยประจำรถ">
                <input value={form.station} onChange={(event) => updateForm("station", event.target.value)} className="input-admin" />
              </Field>
              <Field label="สถานะ">
                <select value={form.status} onChange={(event) => updateForm("status", event.target.value)} className="input-admin">
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="ลิงก์รูปภาพ" className="sm:col-span-2">
                <input value={form.image_url} onChange={(event) => updateForm("image_url", event.target.value)} className="input-admin" />
              </Field>
              <Field label="ลำดับแสดงผล">
                <input type="number" value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} className="input-admin" />
              </Field>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} className="h-5 w-5" />
                แสดงรถคันนี้ในระบบ
              </label>
              <Field label="หมายเหตุ" className="sm:col-span-2">
                <textarea rows={4} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="input-admin" />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="min-h-11 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-700 hover:bg-slate-200">ยกเลิก</button>
              <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#7f1324] px-5 text-sm font-black text-white hover:bg-[#99192c] disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <style>{`.input-admin{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:white;padding:10px 12px;font-size:14px;outline:none}.input-admin:focus{border-color:#7f1324;box-shadow:0 0 0 4px rgba(127,19,36,.1)}`}</style>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}
