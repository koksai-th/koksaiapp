import React, { useEffect, useMemo, useState } from "react";
import { Facebook, MessageCircle, RotateCcw, Search, UserRound, UsersRound, IdCard, X, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const SOCIAL_ICONS = {
  facebook: "https://koksairescue.cu.ma/personnel/images/icons/fb.png",
  line: "https://koksairescue.cu.ma/personnel/images/icons/line.png",
  tiktok: "https://koksairescue.cu.ma/personnel/images/icons/tt.png",
};

const BRANCH_ORDER = [
  "หน่วยกู้ภัยกกไทร จังหวัดเพชรบูรณ์",
  "หน่วยกู้ภัยกกไทร อำเภอหล่มสัก",
  "หน่วยกู้ภัยกกไทร อำเภอน้ำหนาว",
  "หน่วยกู้ภัยกกไทร อำเภอเมืองเพชรบูรณ์",
  "หน่วยกู้ภัยกกไทร อำเภอศรีเทพ",
];

const GROUP_ORDER = [
  "ประธานกู้ภัย/รองประธานกู้ภัย",
  "หัวหน้าหน่วยกู้ภัย/รองหัวหน้าหน่วยกู้ภัย",
  "กรรมการกู้ภัย",
  "ที่ปรึกษากู้ภัย",
  "หัวหน้าฝ่ายงาน/รองหัวหน้าฝ่ายงาน",
  "หัวหน้าอาสาฯกู้ภัย/รองหัวหน้าอาสาฯกู้ภัย",
  "เจ้าหน้าที่กู้ภัย/พนักงานกู้ภัย",
  "อาสาสมัครกู้ภัย",
];

function sortIndex(items, value) {
  const index = items.indexOf(value);
  return index === -1 ? 999 : index;
}

function groupPersonnel(rows) {
  return [...rows]
    .sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999))
    .reduce((result, person) => {
      const branch = person.branch || "ไม่ระบุสาขา";
      const group = person.group_name || "ไม่ระบุกลุ่มงาน";
      result[branch] ??= {};
      result[branch][group] ??= [];
      result[branch][group].push(person);
      return result;
    }, {});
}

function SocialIcon({ href, icon, label }) {
  const image = (
    <img
      src={icon}
      alt={label}
      className={`h-7 w-7 transition ${href ? "opacity-100 hover:scale-110" : "opacity-25 grayscale"}`}
    />
  );

  if (!href) {
    return (
      <span
        title={`${label} ไม่มีข้อมูล`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfc98f] bg-[#fffaf0]"
      >
        {image}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={`เปิด ${label}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfc98f] bg-white transition hover:border-[#8a1224] hover:bg-[#fff4dc]"
    >
      {image}
    </a>
  );
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [positionFilter, setPositionFilter] = useState("ทั้งหมด");
  const [branchFilter, setBranchFilter] = useState("ทั้งหมด");
  const [selectedIdCard, setSelectedIdCard] = useState(null);
  const [cardScale, setCardScale] = useState(1);

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("personnel").select("*");
    if (loadError) setError(loadError.message || "ไม่สามารถโหลดข้อมูลบุคลากรได้");
    else setPersonnel(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const positions = useMemo(
    () => [...new Set(personnel.map((person) => person.group_name).filter(Boolean))],
    [personnel],
  );
  const branchOptions = useMemo(
    () => [...new Set(personnel.map((person) => person.branch).filter(Boolean))],
    [personnel],
  );

  const filteredPersonnel = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return personnel.filter((person) => {
      const matchKeyword =
        !search ||
        (person.name || "").toLowerCase().includes(search) ||
        (person.call_sign || "").toLowerCase().includes(search) ||
        (person.position || "").toLowerCase().includes(search);
      const matchPosition =
        positionFilter === "ทั้งหมด" ||
        person.group_name === positionFilter ||
        person.position === positionFilter;
      const matchBranch =
        branchFilter === "ทั้งหมด" ||
        person.branch === branchFilter ||
        person.section === branchFilter;
      return matchKeyword && matchPosition && matchBranch;
    });
  }, [branchFilter, keyword, personnel, positionFilter]);

  const grouped = useMemo(() => groupPersonnel(filteredPersonnel), [filteredPersonnel]);
  const branches = useMemo(
    () => Object.keys(grouped).sort((a, b) => sortIndex(BRANCH_ORDER, a) - sortIndex(BRANCH_ORDER, b)),
    [grouped],
  );

  const resetFilters = () => {
    setKeyword("");
    setPositionFilter("ทั้งหมด");
    setBranchFilter("ทั้งหมด");
  };

  const openIdCard = (person) => {
    if (!person.id_card_url) return;
    setSelectedIdCard(person);
    setCardScale(1);
  };

  const closeIdCard = () => {
    setSelectedIdCard(null);
    setCardScale(1);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rescue-page-hero relative overflow-hidden rounded-[28px] border border-[#e4c477] bg-gradient-to-br from-[#5a0915] via-[#8f1728] to-[#4d0712] p-5 text-white shadow-[0_22px_45px_rgba(70,10,20,0.45),0_8px_0_rgba(60,5,15,0.9)] sm:p-6">
        <div className="pointer-events-none absolute inset-[1px] rounded-[27px] bg-gradient-to-b from-white/20 via-transparent to-black/35" />
        <div className="pointer-events-none absolute -left-10 -top-8 h-36 w-72 rounded-full bg-[#f5d990]/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/30 blur-xl" />

        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f5d990]/70 bg-gradient-to-br from-[#fff3c4] via-[#d4a84f] to-[#8b5a10] shadow-[inset_0_3px_5px_rgba(255,255,255,0.7),0_8px_18px_rgba(0,0,0,0.35)]">
            <UsersRound className="h-7 w-7 text-[#6b0d1c] drop-shadow" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-black leading-tight tracking-tight drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)] sm:text-2xl">
              ทำเนียบบุคลากรหน่วยกู้ภัยกกไทร
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-white/85 drop-shadow sm:text-sm">
              ค้นหาเจ้าหน้าที่ตามชื่อ นามเรียกขาน หน่วยงาน และตำแหน่ง
            </p>
          </div>

          <div className="ml-auto hidden rounded-full border border-[#f5d990] bg-gradient-to-b from-white/20 to-black/20 px-4 py-2 text-sm font-black text-[#f8e6b4] shadow-[0_5px_12px_rgba(0,0,0,0.35)] sm:block">
            {filteredPersonnel.length} คน
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-[#dbc58e] bg-white p-3.5 shadow-[0_10px_24px_rgba(73,31,14,0.07)] sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto]">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a1224]" />
            <input
              className="rescue-field min-h-11 w-full rounded-xl border border-[#cdb575] bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none"
              placeholder="ค้นหา ชื่อ / นามเรียกขาน"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>

          <select
            className="rescue-field min-h-11 w-full rounded-xl border border-[#cdb575] bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
            aria-label="กรองตามตำแหน่ง"
          >
            <option>ทั้งหมด</option>
            {positions.map((position) => <option key={position}>{position}</option>)}
          </select>

          <select
            className="rescue-field min-h-11 w-full rounded-xl border border-[#cdb575] bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            aria-label="กรองตามสาขา"
          >
            <option>ทั้งหมด</option>
            {branchOptions.map((branch) => <option key={branch}>{branch}</option>)}
          </select>

          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#8a1224] bg-white px-4 py-2.5 text-sm font-black text-[#71101e] transition hover:bg-[#71101e] hover:text-white"
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            ล้างตัวกรอง
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-[20px] border border-[#dbc58e] bg-white px-4 py-10 text-center text-sm font-bold text-slate-600">
          กำลังโหลดข้อมูลบุคลากร...
        </div>
      ) : null}

      {!loading && !branches.length ? (
        <div className="rounded-[20px] border border-dashed border-[#cdb575] bg-[#fffaf0] px-4 py-10 text-center text-sm font-bold text-slate-600">
          ไม่พบบุคลากรตามเงื่อนไขที่เลือก
        </div>
      ) : null}

      {branches.map((branch) => (
        <section key={branch} className="overflow-hidden rounded-[22px] border border-[#d7bd7a] bg-white shadow-[0_12px_28px_rgba(64,25,11,0.08)]">
          <div className="border-b border-[#d7bd7a] bg-[linear-gradient(90deg,#6e0f1d,#8e1728)] px-4 py-3.5 text-sm font-black text-white sm:px-5 sm:text-base">
            {branch}
          </div>

          <div className="space-y-5 p-3.5 sm:p-5">
            {Object.entries(grouped[branch])
              .sort(([a], [b]) => sortIndex(GROUP_ORDER, a) - sortIndex(GROUP_ORDER, b))
              .map(([groupName, persons]) => (
                <div key={groupName}>
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#dfc98f] bg-[#fff8e8] px-3 py-2.5 text-sm font-black text-[#67101d]">
                    <span className="h-2 w-2 rounded-full bg-[#c79c3e]" />
                    <span className="min-w-0 flex-1">{groupName}</span>
                    <span className="rounded-full border border-[#dfc98f] bg-white px-2 py-0.5 text-[11px] text-slate-600">{persons.length}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {persons.map((person) => (
                      <article
                        key={person.id}
                        className="group relative overflow-hidden rounded-[18px] border-2 border-[#dfc98f] bg-white p-4 shadow-[0_8px_18px_rgba(70,26,12,0.07)] transition hover:border-[#9c2435] hover:shadow-[0_12px_24px_rgba(112,16,30,0.13)]"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#741120,#c59a3c,#741120)]" />
                        <div className="flex items-start gap-3.5">
                          {person.photo_url ? (
                            <img
                              src={person.photo_url}
                              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-[#d6b86e] object-cover shadow-sm"
                              alt={person.name || "บุคลากร"}
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-[#d6b86e] bg-[#fff4d8] text-[#7b1322]">
                              <UserRound className="h-9 w-9" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-base font-black leading-snug text-slate-900">{person.name || "-"}</h3>
                            <div className="mt-1 inline-flex rounded-lg bg-[#7b1322] px-2 py-1 text-[11px] font-black text-white">
                              {person.call_sign || "ไม่มีนามเรียกขาน"}
                            </div>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{person.position || "-"}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-[#eee1bd] pt-3">
                          {person.id_card_url ? (
                            <button
                              type="button"
                              onClick={() => openIdCard(person)}
                              title="ดูบัตรประจำตัว"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfc98f] bg-white text-[#7f1324] transition hover:border-[#8a1224] hover:bg-[#fff4dc]"
                            >
                              <IdCard className="h-5 w-5" />
                            </button>
                          ) : null}

                          <SocialIcon
                            href={person.facebook}
                            icon={SOCIAL_ICONS.facebook}
                            label="Facebook"
                          />
                          <SocialIcon
                            href={person.line}
                            icon={SOCIAL_ICONS.line}
                            label="LINE"
                          />
                          <SocialIcon
                            href={person.tiktok}
                            icon={SOCIAL_ICONS.tiktok}
                            label="TikTok"
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}

      {selectedIdCard ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="relative flex max-h-[90vh] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#7f1324] px-4 py-3 text-white">
              <div className="font-black">
                บัตรประจำตัว {selectedIdCard.name || ""}
              </div>
              <button
                type="button"
                onClick={closeIdCard}
                className="rounded-lg bg-white/20 p-2 hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-center overflow-auto bg-slate-100 p-4">
              <img
                src={selectedIdCard.id_card_url}
                alt="บัตรประจำตัว"
                className="max-h-[75vh] object-contain transition-transform duration-200"
                style={{ transform: `scale(${cardScale})` }}
              />
            </div>

            <div className="flex justify-center gap-3 border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => setCardScale((v) => Math.max(0.5, v - 0.25))}
                className="rounded-xl border border-[#dfc98f] bg-white px-4 py-2 font-bold text-[#7f1324]"
              >
                <ZoomOut className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setCardScale((v) => Math.min(3, v + 0.25))}
                className="rounded-xl border border-[#dfc98f] bg-white px-4 py-2 font-bold text-[#7f1324]"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
