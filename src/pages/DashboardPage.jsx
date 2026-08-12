import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  HeartPulse,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  Shield,
  Siren,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_SLIDES = [
  {
    id: "fallback-1",
    src: "/slides/slide-1.png",
    title: "พบอุบัติเหตุ-ผู้ป่วยฉุกเฉิน-ต้องการความช่วยเหลือ โทร 1669",
    subtitle: "รับแจ้งเหตุและประสานงาน",
  },
  {
    id: "fallback-2",
    src: "/slides/slide-2.png",
    title: "หน่วยกู้ภัยกกไทร สำนักงานใหญ่",
    subtitle: "ช่วยเหลืออุบัติเหตุ ผู้ป่วยฉุกเฉิน และบริการสาธารณะ",
  },
  {
    id: "fallback-3",
    src: "/slides/slide-3.png",
    title: "สนับสนุนน้ำมันรถพยาบาล",
    subtitle: "ร่วมสนับสนุนเชื้อเพลิงรถพยาบาล-กู้ภัย เพื่อช่วยเหลือประชาชน",
  },
];

function getCaseTypeMeta(type) {
  if (type === "accident") {
    return {
      label: "อุบัติเหตุ",
      icon: Siren,
      chip: "bg-rose-50 text-rose-700 border-rose-200",
      iconWrap: "bg-rose-100 text-[#7f1324]",
    };
  }
  if (type === "emergency") {
    return {
      label: "ผู้ป่วยฉุกเฉิน",
      icon: HeartPulse,
      chip: "bg-amber-50 text-amber-700 border-amber-200",
      iconWrap: "bg-amber-100 text-amber-700",
    };
  }
  return {
    label: "บริการสาธารณะ",
    icon: Shield,
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconWrap: "bg-sky-100 text-sky-700",
  };
}

function countPatientsByStatus(rows, status) {
  return rows.reduce((sum, row) => {
    if (!Array.isArray(row?.patients_json)) return sum;
    return sum + row.patients_json.filter((item) => item?.status === status).length;
  }, 0);
}

function buildTambonRows(rows) {
  const tambonMap = new globalThis.Map();

  for (const row of rows) {
    const key = row?.tambon || "ไม่ระบุตำบล";
    if (!tambonMap.has(key)) {
      tambonMap.set(key, {
        tambon: key,
        total_cases: 0,
        accident: 0,
        emergency: 0,
        public_service: 0,
      });
    }

    const item = tambonMap.get(key);
    item.total_cases += 1;
    if (row?.case_type === "accident") item.accident += 1;
    if (row?.case_type === "emergency") item.emergency += 1;
    if (row?.case_type === "public_service") item.public_service += 1;
  }

  return Array.from(tambonMap.values()).sort((a, b) => b.total_cases - a.total_cases);
}

function formatDateTime(dateValue, timeValue) {
  if (!dateValue && !timeValue) return "-";
  const raw = `${dateValue || ""} ${timeValue || ""}`.trim();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw || "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByNewest(rows) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(`${a?.incident_date || ""} ${a?.incident_time || ""}`.trim()).getTime();
    const bTime = new Date(`${b?.incident_date || ""} ${b?.incident_time || ""}`.trim()).getTime();
    return bTime - aTime;
  });
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#ddc690] bg-gradient-to-br from-[#fffaf0] to-[#faf4e7] px-4 py-7 text-center text-[13px] font-medium leading-relaxed text-slate-500 sm:rounded-[24px] sm:px-5 sm:py-8 sm:text-sm">
      {text}
    </div>
  );
}

function CountUpNumber({ value, duration = 900 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const end = Number(value || 0);
    let frameId;
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(end * eased));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{displayValue.toLocaleString("th-TH")}</>;
}

function SliderPanel({ slides = DEFAULT_SLIDES }) {
  const [index, setIndex] = useState(0);
  const safeSlides = Array.isArray(slides) && slides.length ? slides : DEFAULT_SLIDES;

  useEffect(() => {
    setIndex((current) => (current < safeSlides.length ? current : 0));
  }, [safeSlides.length]);

  useEffect(() => {
    if (safeSlides.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [safeSlides.length]);

  const activeSlide = safeSlides[index] || DEFAULT_SLIDES[0];

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#ecd7a3]/60 bg-[#2f0912] shadow-[0_18px_38px_rgba(127,19,36,0.24)] sm:rounded-[28px] lg:rounded-[30px] lg:shadow-[0_24px_55px_rgba(127,19,36,0.30)]">
      <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
        <div className="absolute inset-0">
          <img
            src={activeSlide.src}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl"
          />

          <img
            src={activeSlide.src}
            alt={activeSlide.title}
            className="relative z-10 h-full w-full object-cover object-center"
            onError={(e) => {
              e.currentTarget.src = "/slides/fallback.png";
            }}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#22040b]/90 via-[#4a0a16]/55 to-[#0d1117]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#170308]/90 via-transparent to-transparent" />

        <div className="pointer-events-none absolute left-4 top-4 h-24 w-24 rounded-full bg-red-500/25 blur-3xl animate-pulse" />
        <div
          className="pointer-events-none absolute right-6 top-6 h-24 w-24 rounded-full bg-[#c49a3d]/20 blur-3xl animate-pulse"
          style={{ animationDelay: "0.8s" }}
        />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-white backdrop-blur sm:left-5 sm:top-5 sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2">
          <Siren className="h-3.5 w-3.5 text-[#f0cf88] sm:h-4 sm:w-4" />
          <span className="text-[10px] font-bold tracking-[0.14em] text-white/90 sm:text-xs sm:tracking-[0.16em]">NEWS</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 lg:p-6">
          <div className="w-full max-w-3xl rounded-[18px] border border-white/10 bg-black/35 p-2.5 text-white backdrop-blur-md sm:rounded-[24px] sm:p-4 lg:p-5">
            <div className="flex items-center gap-2 text-[#f0cf88]">
              <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.16em]">ภาพสไลด์ประชาสัมพันธ์</span>
            </div>
            <h3 className="mt-2 break-words text-[clamp(0.95rem,4vw,1.6rem)] font-black leading-tight sm:mt-2.5">{activeSlide.title}</h3>
            <p className="mt-1.5 line-clamp-2 break-words text-[clamp(0.7rem,2.5vw,1rem)] leading-relaxed text-white/80 sm:mt-2">{activeSlide.subtitle}</p>
            {activeSlide.linkUrl ? (
              <a
                href={activeSlide.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0cf88] active:scale-[0.98] sm:text-sm"
              >
                เปิดรายละเอียด <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label="สไลด์ก่อนหน้า"
          onClick={() => setIndex((prev) => (prev === 0 ? safeSlides.length - 1 : prev - 1))}
          className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0cf88] active:scale-95 sm:left-3 sm:h-12 sm:w-12 sm:rounded-2xl"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <button
          type="button"
          aria-label="สไลด์ถัดไป"
          onClick={() => setIndex((prev) => (prev + 1) % safeSlides.length)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0cf88] active:scale-95 sm:right-3 sm:h-12 sm:w-12 sm:rounded-2xl"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="absolute right-3 top-3 flex items-center gap-1.5 sm:right-5 sm:top-5 sm:gap-2">
          {safeSlides.map((item, dotIndex) => (
            <button
              key={item.id || item.title || item.src}
              type="button"
              onClick={() => setIndex(dotIndex)}
              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                index === dotIndex ? "w-7 bg-[#f0cf88] sm:w-8" : "w-2 bg-white/55 sm:w-2.5"
              }`}
              aria-label={`slide-${dotIndex + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat3DCard({ title, value, icon: Icon, accent = "gold" }) {
  const styles =
    accent === "red"
      ? {
          card: "from-[#fff0f2] via-[#ffe4e9] to-[#ffd6df] border-[#efb7c4] text-[#7f1324]",
          icon: "from-[#7f1324] to-[#b11f33] text-[#ffd8df] border-[#8f1b2d]/30",
          glow: "bg-red-400/25",
        }
      : accent === "dark"
          ? {
              card: "from-[#f8f3ea] via-[#efe5d3] to-[#e4d4b5] border-[#d8c29a] text-[#5b3d09]",
              icon: "from-[#5d0f1d] to-[#8b1427] text-[#f7e1a6] border-[#8b1427]/30",
              glow: "bg-amber-300/25",
            }
          : {
              card: "from-[#fff8e7] via-[#fff1cd] to-[#ffe4a6] border-[#efd08a] text-[#7a4b00]",
              icon: "from-[#a36a00] to-[#d4971a] text-[#fff7df] border-[#d4971a]/30",
              glow: "bg-yellow-300/25",
            };

  return (
    <div
      className={`relative min-h-[148px] overflow-hidden rounded-[22px] border bg-gradient-to-br ${styles.card} p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.98),inset_0_-3px_0_rgba(0,0,0,0.05),0_14px_24px_rgba(15,23,42,0.12),0_4px_0_rgba(255,255,255,0.36)] sm:min-h-[150px] sm:rounded-[26px] sm:p-5`}
    >
      <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl ${styles.glow}`} />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-6 rounded-full bg-white/55 blur-md" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-600/80 sm:text-[11px] sm:tracking-[0.16em]">ข้อมูลสถิติ</div>
          <h3 className="mt-1 break-words text-sm font-black leading-tight text-slate-900 sm:text-base">{title}</h3>
          <div className="mt-4 text-[clamp(1.7rem,7vw,2.5rem)] font-black leading-none">
            <CountUpNumber value={value} />
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-600">จำนวนเคส</div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_14px_rgba(0,0,0,0.12)] sm:h-14 sm:w-14 ${styles.icon}`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ incidents = [] }) {
  const safeRows = Array.isArray(incidents) ? incidents : [];
  const [dashboardSlides, setDashboardSlides] = useState(DEFAULT_SLIDES);
  const [newsItems, setNewsItems] = useState([]);
  const [dashboardSettings, setDashboardSettings] = useState({
    organization_name: "หน่วยกู้ภัยกกไทร สำนักงานใหญ่",
    emergency_phone: "",
    facebook_url: "",
    line_url: "",
  });

  useEffect(() => {
    let active = true;

    async function loadDashboardContent() {
      const [slidesResult, newsResult, settingsResult] = await Promise.all([
        supabase
          .from("dashboard_slides")
          .select("id,title,subtitle,image_url,link_url,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("news")
          .select("id,title,summary,image_url,link_url,published_at,sort_order")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("published_at", { ascending: false })
          .limit(6),
        supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["organization_name", "emergency_phone", "facebook_url", "line_url"]),
      ]);

      if (!active) return;

      if (!slidesResult.error && slidesResult.data?.length) {
        setDashboardSlides(
          slidesResult.data.map((row) => ({
            id: row.id,
            src: row.image_url,
            title: row.title || "ประชาสัมพันธ์",
            subtitle: row.subtitle || "",
            linkUrl: row.link_url || "",
          }))
        );
      }

      if (!newsResult.error && newsResult.data?.length) {
        const now = Date.now();
        setNewsItems(
          newsResult.data.filter((row) => !row.published_at || new Date(row.published_at).getTime() <= now).slice(0, 3)
        );
      }

      if (!settingsResult.error && settingsResult.data?.length) {
        setDashboardSettings((current) => ({
          ...current,
          ...Object.fromEntries(settingsResult.data.map((row) => [row.key, row.value])),
        }));
      }
    }

    loadDashboardContent();
    return () => {
      active = false;
    };
  }, []);

  const recentRows = useMemo(() => sortByNewest(safeRows).slice(0, 8), [safeRows]);
  const tambonRows = useMemo(() => buildTambonRows(safeRows).slice(0, 8), [safeRows]);

  const fullStats = useMemo(
    () => ({
      total: safeRows.length,
      accident: safeRows.filter((x) => x?.case_type === "accident").length,
      emergency: safeRows.filter((x) => x?.case_type === "emergency").length,
      publicService: safeRows.filter((x) => x?.case_type === "public_service").length,
      injured: countPatientsByStatus(safeRows, "บาดเจ็บ"),
      deceased: countPatientsByStatus(safeRows, "เสียชีวิต"),
    }),
    [safeRows]
  );

  const topTambonMax = Math.max(...tambonRows.map((row) => Number(row.total_cases || 0)), 1);

  const statCards = [
    {
      title: "เคสรวมทั้งหมด",
      value: fullStats.total,
      icon: ClipboardList,
      accent: "dark",
    },
    {
      title: "อุบัติเหตุ",
      value: fullStats.accident,
      icon: Siren,
      accent: "red",
    },
    {
      title: "ผู้ป่วยฉุกเฉิน",
      value: fullStats.emergency,
      icon: HeartPulse,
      accent: "gold",
    },
    {
      title: "บริการสาธารณะ",
      value: fullStats.publicService,
      icon: Shield,
      accent: "gold",
    },
  ];

  return (
    <div className="min-w-0 overflow-hidden space-y-4 sm:space-y-5 lg:space-y-6">
      <section className="relative overflow-hidden rounded-[22px] border border-[#f3d37f]/45 bg-[linear-gradient(180deg,#b51f35_0%,#99172b_38%,#7c1021_68%,#5f0b18_100%)] p-4 text-white shadow-[0_16px_30px_rgba(90,10,24,0.28),0_6px_0_rgba(92,10,24,0.95),inset_0_2px_0_rgba(255,255,255,0.28),inset_0_-10px_18px_rgba(50,6,14,0.28)] sm:rounded-[28px] sm:p-5 lg:rounded-[32px] lg:p-6 lg:shadow-[0_22px_40px_rgba(90,10,24,0.34),0_8px_0_rgba(92,10,24,0.95),inset_0_2px_0_rgba(255,255,255,0.28),inset_0_-10px_18px_rgba(50,6,14,0.28)]">
        <span className="pointer-events-none absolute inset-[1px] rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_36%,transparent_60%)] sm:rounded-[26px] lg:rounded-[30px]" />
        <span className="pointer-events-none absolute left-6 top-0 h-14 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[clamp(1.25rem,4.6vw,2rem)] font-black leading-tight">ศูนย์ข้อมูลสถิติเคส</h2>
            <p className="mt-2 max-w-2xl text-[clamp(0.8rem,2.8vw,0.95rem)] leading-relaxed text-white/85">
              ภาพรวมสถิติเคสที่ออกปฏิบัติงาน 
            </p>
          </div>
        </div>
        <span className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/18 blur-xl" />
      </section>

      <SliderPanel slides={dashboardSlides} />

      {newsItems.length ? (
        <section className="rounded-[22px] border border-[#ead9b3]/70 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 lg:p-6">
          <div className="flex items-center gap-2.5">
            <Newspaper className="h-5 w-5 shrink-0 text-[#7f1324] sm:h-6 sm:w-6" />
            <h3 className="text-base font-black text-slate-900 sm:text-lg lg:text-xl">ข่าวประชาสัมพันธ์</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {newsItems.map((item) => {
              const content = (
                <>
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="aspect-video h-auto w-full rounded-xl object-cover sm:rounded-2xl" loading="lazy" />
                  ) : null}
                  <div className="mt-3 break-words text-sm font-black leading-snug text-slate-900 sm:text-base">{item.title}</div>
                  {item.summary ? <p className="mt-2 line-clamp-3 break-words text-[13px] leading-relaxed text-slate-600 sm:text-sm">{item.summary}</p> : null}
                  {item.link_url ? (
                    <div className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-[#7f1324] sm:text-sm">
                      อ่านรายละเอียด <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                  ) : null}
                </>
              );

              return item.link_url ? (
                <a
                  key={item.id}
                  href={item.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] border border-slate-200 bg-gradient-to-br from-white to-[#faf5ea] p-3.5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f1324]/35 active:scale-[0.995] sm:rounded-[22px] sm:p-4"
                >
                  {content}
                </a>
              ) : (
                <article key={item.id} className="rounded-[18px] border border-slate-200 bg-gradient-to-br from-white to-[#faf5ea] p-3.5 sm:rounded-[22px] sm:p-4">
                  {content}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[22px] border border-[#ead9b3]/70 bg-gradient-to-br from-[#fffaf0] via-white to-[#f8efe0] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_28px_rgba(127,19,36,0.09)] sm:rounded-[28px] sm:p-5 lg:rounded-[30px] lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7f1324] sm:text-[11px] sm:tracking-[0.18em]">Stat Command Blocks</div>
            <div className="text-base font-black text-slate-900 sm:text-lg">กล่องข้อมูลสถิติ</div>
          </div>
          </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {statCards.map((item) => (
            <Stat3DCard
              key={item.id || item.title || item.src}
              title={item.title}
              value={item.value}
              icon={item.icon}
              accent={item.accent}
            />
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 sm:gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="min-w-0 rounded-[22px] border border-[#ead9b3]/70 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 lg:p-6">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 shrink-0 text-[#7f1324] sm:h-6 sm:w-6" />
            <h3 className="text-base font-black text-slate-900 sm:text-lg lg:text-xl">สถิติเคสแต่ละตำบล</h3>
          </div>

          <div className="mt-4 space-y-3">
            {!tambonRows.length ? (
              <EmptyState text="ยังไม่มีข้อมูลตำบลจากเคสที่บันทึก" />
            ) : (
              tambonRows.map((row) => {
                const width = `${(Number(row.total_cases || 0) / topTambonMax) * 100}%`;
                return (
                  <div key={row.tambon} className="rounded-[18px] border border-slate-200 bg-gradient-to-r from-white to-[#faf5ea] p-3.5 sm:rounded-[24px] sm:p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 break-words text-sm font-bold text-slate-900 sm:text-base">{row.tambon}</div>
                      <div className="shrink-0 rounded-xl bg-[#fff2d1] px-3 py-1.5 text-xs font-bold text-[#7f1324] sm:text-sm">
                        {Number(row.total_cases || 0).toLocaleString("th-TH")} เคส
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 sm:h-3">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#7f1324] to-[#d4a84f]" style={{ width }} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] font-medium text-slate-600 sm:grid-cols-3 sm:text-xs">
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center">อุบัติเหตุ {row.accident || 0}</div>
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center">ผู้ป่วยฉุกเฉิน {row.emergency || 0}</div>
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center">บริการสาธารณะ {row.public_service || 0}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-[22px] border border-[#ead9b3]/70 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 lg:p-6">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 shrink-0 text-[#7f1324] sm:h-6 sm:w-6" />
            <h3 className="text-base font-black text-slate-900 sm:text-lg lg:text-xl">เคสล่าสุด</h3>
          </div>

          <div className="mt-4 space-y-3">
            {!recentRows.length ? (
              <EmptyState text="ยังไม่มีเคสในระบบ" />
            ) : (
              recentRows.map((row) => {
                const meta = getCaseTypeMeta(row.case_type);
                const Icon = meta.icon;

                return (
                  <div key={row.id} className="rounded-[18px] border border-slate-200 bg-gradient-to-r from-white to-[#faf5ea] p-3.5 sm:rounded-[24px] sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${meta.iconWrap}`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="break-words text-sm font-black text-slate-900 sm:text-base">{row.case_id || "ไม่ระบุเลขเคส"}</div>
                          <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold sm:text-[11px] ${meta.chip}`}>{meta.label}</div>
                        </div>
                        <div className="mt-2 break-words text-[13px] leading-relaxed text-slate-700 sm:text-sm">{row.place || row.location_text || "-"}</div>
                        <div className="mt-1 break-words text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                          {row.tambon || "ไม่ระบุตำบล"} • {formatDateTime(row.incident_date, row.incident_time)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
