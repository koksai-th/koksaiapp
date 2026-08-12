export function formatThaiDate(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatThaiDateShort(dateStr) {
  if (!dateStr) return "-";

  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return "-";

  const [yyyy, mm, dd] = parts;
  const buddhistYear = Number(yyyy) + 543;

  if (!yyyy || !mm || !dd || Number.isNaN(buddhistYear)) return "-";
  return `${dd}/${mm}/${buddhistYear}`;
}

export function convertThaiDisplayToIso(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";

  const parts = cleaned.split("/");
  if (parts.length !== 3) return null;

  let [dd, mm, yyyy] = parts.map((x) => x.trim());

  if (!dd || !mm || !yyyy) return null;

  if (yyyy.length === 4 && Number(yyyy) > 2400) {
    yyyy = String(Number(yyyy) - 543);
  }

  dd = dd.padStart(2, "0");
  mm = mm.padStart(2, "0");
  yyyy = yyyy.padStart(4, "0");

  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  const valid =
    date.getFullYear() === Number(yyyy) &&
    date.getMonth() + 1 === Number(mm) &&
    date.getDate() === Number(dd);

  return valid ? iso : null;
}