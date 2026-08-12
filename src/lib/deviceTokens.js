import { supabase } from "./supabaseClient";

function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "web";
}

export async function saveDeviceTokenForUser(token, user, profile = {}) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken || !user?.id) return null;

  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    token: normalizedToken,
    platform: detectPlatform(),
    rescue_station: profile?.rescue_station || "all",
    is_active: true,
    last_seen_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("device_tokens")
    .upsert(row, { onConflict: "token" })
    .select("token,platform,is_active,last_seen_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveDeviceTokenForUser(userId, token = "") {
  if (!userId) return null;

  let query = supabase
    .from("device_tokens")
    .select("token,platform,is_active,last_seen_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false })
    .limit(1);

  if (token) query = query.eq("token", token);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function deactivateDeviceToken(token, userId) {
  if (!token || !userId) return;

  const { error } = await supabase
    .from("device_tokens")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("token", token);

  if (error) throw error;
}
