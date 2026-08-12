import { supabase } from "./supabaseClient";

const INBOX_SELECT = `
  notification_id,
  user_id,
  read_at,
  created_at,
  notification:notifications!inner(
    id,
    type,
    title,
    body,
    data,
    incident_id,
    target_station,
    created_at
  )
`;

export async function loadInboxNotifications(userId, limit = 100) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notification_recipients")
    .select(INBOX_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("notification_recipients")
    .select("notification_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return Number(count || 0);
}

export async function markNotificationRead(notificationId, userId) {
  if (!notificationId || !userId) return;

  const { error } = await supabase
    .from("notification_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("notification_id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from("notification_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function sendIncidentPush({
  title,
  body,
  incidentId,
  caseId,
  targetStation = "all",
}) {
  const { data, error } = await supabase.functions.invoke(
    "send-alert",
    {
      body: {
        title,
        body,
        incident_id: incidentId,
        case_id: caseId,
        targetStation,
        data: {
          type: "incident",
          incident_id: incidentId || "",
          incidentId: incidentId || "",
          case_id: caseId || "",
          caseId: caseId || "",
          url: incidentId ? `/incident/${incidentId}` : "/",
        },
      },
    }
  );

  if (error) throw error;

  return data;
}