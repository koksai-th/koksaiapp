import { supabase } from "./supabaseClient";
import { getCurrentDate, getCurrentTime, parseGps, createInitialForm } from "./core";

const INCIDENT_IMAGE_BUCKET = "incident-photos";
const STORAGE_PAGE_SIZE = 1000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;


const VALID_CASE_TYPES = new Set(["accident", "emergency", "public_service"]);

export function validateIncidentForm(form = {}) {
  const errors = [];
  const date = String(form.caseDate || "").trim();
  const time = String(form.caseTime || "").trim();
  const caseType = String(form.caseType || "").trim();
  const place = String(form.place || "").trim();
  const details = String(form.accidentDetails || form.details || "").trim();
  const gpsText = String(form.gps || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    errors.push("วันที่เกิดเหตุไม่ถูกต้อง");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    errors.push("เวลาเกิดเหตุไม่ถูกต้อง");
  }
  if (!VALID_CASE_TYPES.has(caseType)) errors.push("กรุณาเลือกประเภทเคส");
  if (place.length < 2) errors.push("กรุณาระบุสถานที่เกิดเหตุ");
  if (details.length < 2) errors.push("กรุณาระบุรายละเอียดเหตุ");
  if (place.length > 500) errors.push("สถานที่เกิดเหตุยาวเกิน 500 ตัวอักษร");
  if (details.length > 5000) errors.push("รายละเอียดเหตุยาวเกิน 5,000 ตัวอักษร");
  if (String(form.reporterPhone || "").length > 50) errors.push("เบอร์ผู้แจ้งยาวเกินกำหนด");
  if (gpsText && !parseGps(gpsText)) errors.push("รูปแบบพิกัด GPS ไม่ถูกต้อง");

  return errors;
}

function assertValidIncidentForm(form) {
  const errors = validateIncidentForm(form);
  if (errors.length) throw new Error(errors.join(" • "));
}

function isBrowserFile(value) {
  return typeof File !== "undefined" && value instanceof File;
}

function getStoredPath(image) {
  if (typeof image === "string") return image.trim();
  return String(image?.path || image?.storagePath || "").trim();
}

async function removeStoredImages(images = []) {
  const paths = [...new Set(images.map(getStoredPath).filter(Boolean))];
  if (!paths.length) return;

  const { error } = await supabase.storage.from(INCIDENT_IMAGE_BUCKET).remove(paths);
  if (error) throw error;
}

function safeImageExtension(file) {
  const fromName = String(file?.name || "").split(".").pop()?.toLowerCase() || "";
  if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName;

  const fromMime = String(file?.type || "").split("/").pop()?.toLowerCase() || "jpg";
  return /^[a-z0-9]{2,5}$/.test(fromMime) ? fromMime : "jpg";
}

async function uploadImages(images = [], caseId = "unknown") {
  const storedImages = [];
  const uploadedPaths = [];
  const safeCaseId = String(caseId || "unknown").replace(/[^a-zA-Z0-9._-]+/g, "-");

  try {
    for (const image of images) {
      if (!isBrowserFile(image)) {
        storedImages.push(image);
        continue;
      }

      if (!String(image.type || "").startsWith("image/")) {
        throw new Error(`ไฟล์ ${image.name || "ที่เลือก"} ไม่ใช่รูปภาพ`);
      }
      if (Number(image.size || 0) > MAX_IMAGE_BYTES) {
        throw new Error(`รูป ${image.name || "ที่เลือก"} มีขนาดเกิน 10 MB`);
      }

      const extension = safeImageExtension(image);
      const fileName = `${safeCaseId}-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extension}`;
      const filePath = `incident-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(INCIDENT_IMAGE_BUCKET)
        .upload(filePath, image, {
          cacheControl: "3600",
          contentType: image.type || undefined,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedPaths.push(filePath);
      storedImages.push({ path: filePath, name: image.name, type: image.type || "" });
    }
  } catch (error) {
    if (uploadedPaths.length) {
      await removeStoredImages(uploadedPaths).catch((cleanupError) => {
        console.warn("cleanup uploaded images failed", cleanupError);
      });
    }
    throw new Error(error?.message || "อัปโหลดรูปภาพไม่สำเร็จ");
  }

  return { storedImages, uploadedPaths };
}

async function hydrateStoredImage(image) {
  if (!image || typeof image !== "object" || !image.path) return image;

  const { data, error } = await supabase.storage
    .from(INCIDENT_IMAGE_BUCKET)
    .createSignedUrl(image.path, 60 * 60);

  if (error) {
    console.warn("create signed image url error", error);
    return { ...image, url: "", publicUrl: "" };
  }

  return { ...image, url: data?.signedUrl || "", publicUrl: data?.signedUrl || "" };
}

async function hydrateIncidentRow(row) {
  if (!row) return row;
  const images = Array.isArray(row.images_json) ? row.images_json : [];
  return { ...row, images_json: await Promise.all(images.map(hydrateStoredImage)) };
}

async function hydrateRowsInBatches(rows, batchSize = 100) {
  const imagePaths = [...new Set(
    rows.flatMap((row) =>
      (Array.isArray(row?.images_json) ? row.images_json : [])
        .map(getStoredPath)
        .filter(Boolean),
    ),
  )];

  if (!imagePaths.length) return rows;

  const signedUrlByPath = new Map();
  for (let index = 0; index < imagePaths.length; index += batchSize) {
    const paths = imagePaths.slice(index, index + batchSize);
    const { data, error } = await supabase.storage
      .from(INCIDENT_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 60);

    if (error) {
      console.warn("create signed image urls error", error);
      continue;
    }

    for (const item of data || []) {
      const itemPath = item?.path || item?.signedUrl?.split("/object/sign/")[1]?.split("?")[0];
      if (itemPath && item?.signedUrl) signedUrlByPath.set(itemPath, item.signedUrl);
    }
  }

  return rows.map((row) => ({
    ...row,
    images_json: (Array.isArray(row?.images_json) ? row.images_json : []).map((image) => {
      const imagePath = getStoredPath(image);
      const signedUrl = signedUrlByPath.get(imagePath) || "";
      return typeof image === "string"
        ? { path: image, url: signedUrl, publicUrl: signedUrl }
        : { ...image, url: signedUrl, publicUrl: signedUrl };
    }),
  }));
}

async function formToRow(form, overrides = {}) {
  assertValidIncidentForm(form);
  const pos = parseGps(form.gps || "");
  const caseId = form.caseId || overrides.case_id || `TEMP-${Date.now()}`;
  const { storedImages, uploadedPaths } = await uploadImages(form.images || [], caseId);

  return {
    uploadedPaths,
    row: {
      case_id: caseId,
      incident_date: form.caseDate || getCurrentDate(),
      incident_time: form.caseTime || getCurrentTime(),
      case_type: form.caseType,
      accident_type: form.accidentType || null,
      accident_details: form.accidentDetails || null,
      details: form.details || "",
      location_text: form.place || "",
      place: form.place || "",
      tambon: form.tambon || "",
      reporter_phone: form.reporterPhone || "",
      reporter_name: form.reporterName || "",
      gps_text: form.gps || "",
      gps_lat: pos?.lat ?? null,
      gps_lng: pos?.lng ?? null,
      vehicles_json: Array.isArray(form.vehicles) ? form.vehicles : [],
      patients_json: Array.isArray(form.patients) ? form.patients : [],
      images_json: storedImages,
      destination_type: form.destinationType || null,
      destination_name: form.destinationName || null,
      status: overrides.status || form.status || "open",
      updated_at: new Date().toISOString(),
    },
  };
}

export function incidentRowToForm(row = {}) {
  const form = createInitialForm();

  return {
    ...form,
    caseId: row.case_id || "",
    caseDate: row.incident_date || getCurrentDate(),
    caseTime: String(row.incident_time || getCurrentTime()).slice(0, 5),
    caseType: row.case_type || "",
    accidentType: row.accident_type || "",
    accidentDetails: row.accident_details || "",
    details: row.details || "",
    place: row.place || row.location_text || "",
    tambon: row.tambon || "",
    reporterPhone: row.reporter_phone || "",
    reporterName: row.reporter_name || row.reporterName || "",
    gps:
      row.gps_text ||
      (row.gps_lat != null && row.gps_lng != null ? `${row.gps_lat}, ${row.gps_lng}` : ""),
    gpsLat: row.gps_lat ?? "",
    gpsLng: row.gps_lng ?? "",
    vehicles: Array.isArray(row.vehicles_json) ? row.vehicles_json : [],
    patients: Array.isArray(row.patients_json) ? row.patients_json : [],
    images: Array.isArray(row.images_json) ? row.images_json : [],
    destinationType: row.destination_type || "",
    destinationName: row.destination_name || "",
    status: row.status || "open",
  };
}

export async function loadIncidentsFromDb() {
  const rows = [];

  for (let from = 0; ; from += STORAGE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("incident_date", { ascending: false })
      .order("incident_time", { ascending: false })
      .range(from, from + STORAGE_PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < STORAGE_PAGE_SIZE) break;
  }

  return hydrateRowsInBatches(rows);
}

export async function getNextCaseIdFromDb(date = getCurrentDate()) {
  const { data, error } = await supabase.rpc("next_case_id", {
    p_incident_date: date || getCurrentDate(),
  });

  if (error) throw error;
  if (!data) throw new Error("สร้างเลขเคสอัตโนมัติไม่สำเร็จ");
  return data;
}

export async function createIncidentInDb(form) {
  const caseId = form.caseId || (await getNextCaseIdFromDb(form.caseDate));
  const { row, uploadedPaths } = await formToRow({ ...form, caseId });

  const { data, error } = await supabase.from("incidents").insert(row).select("*").single();

  if (error) {
    await removeStoredImages(uploadedPaths).catch((cleanupError) => {
      console.warn("cleanup failed incident images failed", cleanupError);
    });
    throw error;
  }

  return hydrateIncidentRow(data);
}

export async function updateIncidentInDb(id, form, removedStoredImages = []) {
  const { row, uploadedPaths } = await formToRow(form, { status: form.status || "open" });
  const { data, error } = await supabase
    .from("incidents")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    await removeStoredImages(uploadedPaths).catch((cleanupError) => {
      console.warn("cleanup failed update images failed", cleanupError);
    });
    throw error;
  }

  await removeStoredImages(removedStoredImages).catch((cleanupError) => {
    console.warn("remove old incident images failed", cleanupError);
  });

  return hydrateIncidentRow(data);
}

export async function createQuickIncidentInDb(draft, reporterName = "ศูนย์สั่งการ") {
  return createIncidentInDb({
    ...createInitialForm(),
    caseId: draft.caseId || (await getNextCaseIdFromDb(draft.caseDate)),
    caseDate: draft.caseDate || getCurrentDate(),
    caseTime: draft.caseTime || getCurrentTime(),
    caseType: draft.caseType || "",
    details: draft.details || "",
    place: draft.place || "",
    tambon: draft.tambon || "",
    reporterPhone: draft.reporterPhone || "",
    reporterName,
    gps: draft.gps || "",
  });
}

export async function recordIncidentTimelineEvent(
  incidentId,
  eventType,
  occurredAt = null,
  note = "",
  currentUserId = null,
) {
  if (!incidentId) throw new Error("ไม่พบ ID เคส");
  if (!eventType) throw new Error("ไม่พบขั้นตอนปฏิบัติงาน");

  const timelineByField = {
    w25_scene: {
      at: "w25_scene_at",
      by: "w25_scene_by",
    },
    w22_scene: {
      at: "w22_scene_at",
      by: "w22_scene_by",
    },
    move_hospital: {
      at: "move_hospital_at",
      by: "move_hospital_by",
    },
    w22_hospital: {
      at: "w22_hospital_at",
      by: "w22_hospital_by",
    },
    w14_scene: {
      at: "w14_scene_at",
      by: "w14_scene_by",
    },
    closed: {
      at: "closed_at",
      by: "closed_by",
    },
  };

  const fields = timelineByField[eventType];
  if (!fields) throw new Error("ไม่รองรับขั้นตอนปฏิบัติงานนี้");

  const timestamp = occurredAt || new Date().toISOString();

  const updatePayload = {
    [fields.at]: timestamp,
  };

  if (currentUserId) {
    updatePayload[fields.by] = currentUserId;
  }

  const { data, error } = await supabase
    .from("incidents")
    .update(updatePayload)
    .eq("id", incidentId)
    .select("*")
    .single();

  if (error) throw error;

  return hydrateIncidentRow(data);
}

export async function deleteIncidentFromDb(incident) {
  const id = typeof incident === "string" ? incident : incident?.id;
  if (!id) throw new Error("ไม่พบ ID เคสสำหรับลบ");

  let images = Array.isArray(incident?.images_json) ? incident.images_json : [];
  if (!images.length && typeof incident === "string") {
    const { data } = await supabase.from("incidents").select("images_json").eq("id", id).maybeSingle();
    images = Array.isArray(data?.images_json) ? data.images_json : [];
  }

  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) throw error;

  await removeStoredImages(images).catch((cleanupError) => {
    console.warn("remove deleted incident images failed", cleanupError);
  });

  return true;
}
