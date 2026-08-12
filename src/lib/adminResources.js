import { supabase } from "./supabaseClient";

const ALLOWED_TABLES = new Set([
  "ambulances",
  "news",
  "dashboard_slides",
  "app_settings",
  "profiles",
  "personnel_cards",
]);

function assertAllowedTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`ไม่อนุญาตให้เข้าถึงตาราง ${table}`);
  }
}

export async function loadAdminRows(table, {
  orderBy = "created_at",
  ascending = false,
  limit = 500,
} = {}) {
  assertAllowedTable(table);

  let query = supabase.from(table).select("*");
  if (orderBy) query = query.order(orderBy, { ascending, nullsFirst: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveAdminRow(table, row) {
  assertAllowedTable(table);
  const payload = { ...row };
  const id = payload.id;
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;

  const query = id
    ? supabase.from(table).update(payload).eq("id", id)
    : supabase.from(table).insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteAdminRow(table, id) {
  assertAllowedTable(table);
  if (!id) throw new Error("ไม่พบรายการที่ต้องการลบ");

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function loadAdminCounts() {
  const tables = ["profiles", "personnel", "ambulances", "news", "dashboard_slides"];
  const results = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      return [table, error ? null : Number(count || 0), error?.message || ""];
    }),
  );

  return Object.fromEntries(
    results.map(([table, count, error]) => [table, { count, error }]),
  );
}

export async function loadAppSettings(keys = []) {
  let query = supabase.from("app_settings").select("key, value, description, updated_at");
  if (keys.length) query = query.in("key", keys);

  const { data, error } = await query;
  if (error) throw error;

  return Object.fromEntries((data || []).map((row) => [row.key, row.value]));
}

export async function saveAppSettings(settings) {
  const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" })
    .select("key, value, updated_at");

  if (error) throw error;
  return data || [];
}
