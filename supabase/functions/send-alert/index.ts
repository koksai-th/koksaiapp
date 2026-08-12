import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_STATIONS = new Set([
  "all",
  "หล่มสัก",
  "หล่มเก่า",
  "เขาค้อ",
  "น้ำหนาว",
  "เมือง",
  "ศรีเทพ",
]);
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;
const MAX_DATA_KEYS = 30;
const MAX_DATA_VALUE_LENGTH = 1000;

function normalizeNotificationPath(value: unknown) {
  const raw = String(value || "/").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  try {
    const parsed = new URL(raw, "https://local.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getFirebaseAccessToken() {
  const encoded = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");

const rawJson = encoded
  ? new TextDecoder().decode(
      Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    )
  : Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

  const serviceAccount = rawJson
    ? JSON.parse(rawJson)
    : {
        project_id: Deno.env.get("FIREBASE_PROJECT_ID"),
        client_email: Deno.env.get("FIREBASE_CLIENT_EMAIL"),
        private_key: Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
      };

  const projectId = serviceAccount?.project_id;
  const clientEmail = serviceAccount?.client_email;
  const privateKey = serviceAccount?.private_key;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );

  const jwt = `${unsignedJwt}.${base64Url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson?.error_description || tokenJson?.error || "Cannot get Firebase access token");
  }

  return { accessToken: tokenJson.access_token as string, projectId: projectId as string };
}

function getAppUrl() {
  return (Deno.env.get("APP_URL") || "https://koksairescue.cu.ma").replace(/\/$/, "");
}

function toAbsoluteAppUrl(url: string) {
  const appUrl = getAppUrl();
  return `${appUrl}${normalizeNotificationPath(url)}`;
}

async function sendOneFcmMessage(params: {
  projectId: string;
  accessToken: string;
  token: string;
  platform: string;
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  const messageData: Record<string, string> = {
    ...params.data,
    title: params.title,
    body: params.body,
    url: toAbsoluteAppUrl(params.data.url || "/"),
  };

  const platform = String(params.platform || "web").toLowerCase();
  const isAndroid = platform === "android";
  const isIos = platform === "ios";
  const isNative = isAndroid || isIos;

  // @capacitor/push-notifications returns an APNs token on iOS, not an FCM
  // registration token. Sending that token to the FCM endpoint will always fail.
  // Keep it in device_tokens for a dedicated APNs sender, but report the problem
  // explicitly instead of pretending delivery succeeded.
  if (isIos) {
    return {
      ok: false,
      status: 422,
      token: params.token,
      platform,
      response: {
        error: {
          message: "iOS token is an APNs token; configure APNs sending or use an iOS FCM-token plugin",
        },
      },
    };
  }

  // Web receives data-only and lets firebase-messaging-sw.js create exactly one
  // notification. Native apps need a notification payload so the OS can display
  // it while the app is in the background or terminated.
  const message: Record<string, unknown> = {
    token: params.token,
    data: messageData,
  };

  if (isNative) {
    message.notification = {
      title: params.title,
      body: params.body,
    };
  }

  if (isAndroid) {
    message.android = {
      priority: "high",
      notification: {
        channel_id: "emergency",
        sound: "siren",
        default_vibrate_timings: true,
      },
    };
  }

  if (!isNative) {
    message.webpush = {
      headers: {
        Urgency: "high",
        TTL: "300",
      },
    };
  }

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const json = await res.json().catch(() => ({}));

  return {
    ok: res.ok,
    status: res.status,
    token: params.token,
    platform,
    response: json,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "Request body is too large" }, 413);
    }

    const payload = await req.json().catch(() => ({}));
    const encodedPayloadSize = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
    if (encodedPayloadSize > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "Request body is too large" }, 413);
    }

    const rawTitle = String(payload?.title || payload?.notificationTitle || "แจ้งเหตุใหม่").trim();
    const rawBody = String(payload?.body || payload?.notificationBody || "มีการแจ้งเหตุจากกู้ภัยกกไทร").trim();

    if (!rawTitle) {
      return jsonResponse({ ok: false, error: "Notification title is required" }, 400);
    }
    if (!rawBody) {
      return jsonResponse({ ok: false, error: "Notification body is required" }, 400);
    }

    // Notification text should not make the whole request fail when incident
    // details are long. Keep the full incident in the database and trim only the
    // text displayed in the push banner.
    const title = rawTitle.slice(0, MAX_TITLE_LENGTH);
    const body = rawBody.slice(0, MAX_BODY_LENGTH);

    const targetStation = String(
      payload?.targetStation ||
        payload?.rescueStation ||
        payload?.data?.targetStation ||
        payload?.data?.rescueStation ||
        "all",
    ).trim();

    if (!ALLOWED_STATIONS.has(targetStation)) {
      return jsonResponse({ ok: false, error: "Unknown rescue station" }, 400);
    }

    const safeData: Record<string, string> = {};
    const incomingData = payload?.data && typeof payload.data === "object" ? payload.data : {};
    const incomingEntries = Object.entries(incomingData);
    if (incomingEntries.length > MAX_DATA_KEYS) {
      return jsonResponse({ ok: false, error: "Too many notification data fields" }, 400);
    }
    for (const [key, value] of incomingEntries) {
      const safeKey = String(key).trim();
      const safeValue = value == null ? "" : String(value);
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(safeKey) || safeValue.length > MAX_DATA_VALUE_LENGTH) {
        return jsonResponse({ ok: false, error: "Invalid notification data" }, 400);
      }
      safeData[safeKey] = safeValue;
    }
    safeData.targetStation = targetStation;
    safeData.rescueStation = targetStation;

    const incidentId = String(
      payload?.incident_id ||
        payload?.incidentId ||
        payload?.id ||
        payload?.data?.incident_id ||
        payload?.data?.incidentId ||
        "",
    ).trim();

    const caseId = String(
      payload?.case_id ||
        payload?.caseId ||
        payload?.data?.case_id ||
        payload?.data?.caseId ||
        "",
    ).trim();

    if (incidentId.length > 100 || caseId.length > 100) {
      return jsonResponse({ ok: false, error: "Incident identifier is too long" }, 400);
    }

    if (incidentId) {
      safeData.type = "incident";
      safeData.incident_id = incidentId;
      safeData.incidentId = incidentId;
      safeData.url = normalizeNotificationPath(
        payload?.url || payload?.data?.url || `/incident/${encodeURIComponent(incidentId)}`,
      );
    } else if (caseId) {
      safeData.type = "incident";
      safeData.case_id = caseId;
      safeData.caseId = caseId;
      safeData.url = normalizeNotificationPath(
        payload?.url || payload?.data?.url || `/incident/${encodeURIComponent(caseId)}`,
      );
    } else {
      safeData.url = normalizeNotificationPath(payload?.url || payload?.data?.url || "/");
    }

    const encodedDataSize = new TextEncoder().encode(JSON.stringify(safeData)).byteLength;
    if (encodedDataSize > 3000) {
      return jsonResponse({ ok: false, error: "Notification data payload is too large" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const authorization = req.headers.get("Authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
    if (authError || !authData.user?.id) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();
    const allowedSenderRoles = new Set(["admin", "boss", "station", "volunteer"]);
    if (
      callerProfileError ||
      !callerProfile?.is_active ||
      !allowedSenderRoles.has(String(callerProfile.role || ""))
    ) {
      return jsonResponse({ ok: false, error: "Forbidden" }, 403);
    }
   
    const { data: recipientProfiles, error: recipientProfileError } = await supabase
      .from("profiles")
      .select("id,rescue_station")
      .eq("is_active", true)
      .in("role", ["admin", "boss", "station", "volunteer"]);

    if (recipientProfileError) throw recipientProfileError;

    const eligibleProfiles = (recipientProfiles || []).filter((row: any) => {
      const station = String(row?.rescue_station || "all").trim() || "all";
      return targetStation === "all" || station === "all" || station === targetStation;
    });

    const recipientUserIds = [
      ...new Set(eligibleProfiles.map((row: any) => String(row?.id || "")).filter(Boolean)),
    ];

    if (!recipientUserIds.length) {
      return jsonResponse({
        ok: false,
        error:
          targetStation === "all"
            ? "ไม่พบเจ้าหน้าที่ที่เปิดใช้งาน"
            : `ไม่พบเจ้าหน้าที่ในพื้นที่ ${targetStation}`,
        targetStation,
        sent: 0,
        inboxRecipients: 0,
      });
    }

    const incidentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(incidentId)
      ? incidentId
      : null;

    const { data: notificationRow, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        type: safeData.type || "incident",
        title,
        body,
        data: safeData,
        incident_id: incidentUuid,
        target_station: targetStation,
        created_by: authData.user.id,
      })
      .select("id")
      .single();

    if (notificationError || !notificationRow?.id) {
      throw notificationError || new Error("Cannot create notification inbox item");
    }

    const recipientRows = recipientUserIds.map((userId) => ({
      notification_id: notificationRow.id,
      user_id: userId,
    }));

    const { error: recipientInsertError } = await supabase
      .from("notification_recipients")
      .insert(recipientRows);

    if (recipientInsertError) {
      await supabase.from("notifications").delete().eq("id", notificationRow.id);
      throw recipientInsertError;
    }

    const { data: tokenRowsData, error: tokenError } = await supabase
      .from("device_tokens")
      .select("token, user_id, is_active, platform")
      .eq("is_active", true)
      .in("user_id", recipientUserIds)
      .not("token", "is", null);

    const tokenRows = tokenError ? [] : (tokenRowsData || []);
    let pushErrorMessage = tokenError?.message || "";
    if (tokenError) console.error("load device tokens failed after inbox creation", tokenError);

    // ป้องกัน token เดียวอยู่ซ้ำหลาย profile แล้วถูกส่งหลายครั้ง
    // พร้อมเก็บ platform เพื่อเลือก payload ให้ถูกกับ Web / Android / iOS
    const tokenTargetByValue = new Map<string, { token: string; platform: string }>();
    for (const row of tokenRows || []) {
      const token = String((row as any)?.token || "").trim();
      if (token.length <= 20 || tokenTargetByValue.has(token)) continue;
      const platform = String((row as any)?.platform || "web").trim().toLowerCase() || "web";
      tokenTargetByValue.set(token, { token, platform });
    }
    const tokenTargets = [...tokenTargetByValue.values()];

    const results: Array<{
      ok: boolean;
      status: number;
      token: string;
      platform: string;
      response: any;
    }> = [];

    if (tokenTargets.length && !pushErrorMessage) {
      try {
        const { accessToken, projectId } = await getFirebaseAccessToken();

        const concurrency = 20;
        for (let index = 0; index < tokenTargets.length; index += concurrency) {
          const batch = tokenTargets.slice(index, index + concurrency);
          const batchResults = await Promise.all(
            batch.map(({ token, platform }) =>
              sendOneFcmMessage({
                projectId,
                accessToken,
                token,
                platform,
                title,
                body,
                data: {
                  ...safeData,
                  notification_id: notificationRow.id,
                  url: `${safeData.url || "/"}${String(safeData.url || "/").includes("?") ? "&" : "?"}notification_id=${notificationRow.id}`,
                },
              }),
            ),
          );
          results.push(...batchResults);
        }
      } catch (pushError) {
        pushErrorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        console.error("push delivery failed after inbox creation", pushError);
      }
    }

    const success = results.filter((r) => r.ok).length;
    const failed = results.length - success;

    const invalidTokens = results
      .filter((r) => {
        const details = Array.isArray(r.response?.error?.details) ? r.response.error.details : [];
        const fcmCode = details.find((item: any) => item?.errorCode)?.errorCode;
        return !r.ok && (r.status === 404 || fcmCode === "UNREGISTERED");
      })
      .map((r) => r.token);

    if (invalidTokens.length) {
      await supabase
        .from("device_tokens")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in("token", invalidTokens);

    }

    const deliveryErrors = results
      .filter((result) => !result.ok)
      .slice(0, 20)
      .map((result) => ({
        platform: result.platform,
        status: result.status,
        error:
          result.response?.error?.message ||
          result.response?.error?.status ||
          "Push delivery failed",
      }));

    return jsonResponse({
      ok: true,
      notificationId: notificationRow.id,
      inboxRecipients: recipientUserIds.length,
      sent: success,
      failed,
      total: results.length,
      targetStation,
      pushError: pushErrorMessage || null,
      deliveryErrors,
      message: pushErrorMessage
        ? "สร้างรายการในกล่องแจ้งเตือนแล้ว แต่ส่ง Push ไม่สำเร็จ"
        : !tokenTargets.length
          ? "สร้างรายการในกล่องแจ้งเตือนแล้ว แต่ไม่มีอุปกรณ์ที่เปิด Push"
          : failed
            ? `ส่ง Push สำเร็จ ${success} อุปกรณ์ และไม่สำเร็จ ${failed} อุปกรณ์`
            : `ส่ง Push สำเร็จ ${success} อุปกรณ์`,
    });
  } catch (error) {
    console.error("send-alert error:", error);

    return jsonResponse(
      {
        ok: false,
        error: "ไม่สามารถส่งการแจ้งเตือนได้ กรุณาตรวจสอบ Edge Function logs",
      },
      500,
    );
  }
});
