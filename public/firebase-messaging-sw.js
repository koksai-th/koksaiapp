/* global firebase, clients */
/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBaE-YivFOP3x-Sj1Y1vNJQggMPoDvaSeg",
  authDomain: "koksaiapp.firebaseapp.com",
  projectId: "koksaiapp",
  storageBucket: "koksaiapp.firebasestorage.app",
  messagingSenderId: "1068920183037",
  appId: "1:1068920183037:web:7ee5244cb4dcd825458694",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || "แจ้งเตือนกู้ภัย";
  const body = data.body || "มีเหตุแจ้งเตือนใหม่";
  const incidentKey = data.incident_id || data.incidentId || data.case_id || data.caseId || "general";

  return self.registration.showNotification(title, {
    body,
    icon: "/notification-icon.png",
    badge: "/notification-badge.png",
    requireInteraction: true,
    tag: `koksai-${incidentKey}`,
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};

  const rawUrl =
    data.url ||
    (data.incident_id || data.incidentId
      ? `/incident/${data.incident_id || data.incidentId}`
      : data.case_id || data.caseId
      ? `/incident/${data.case_id || data.caseId}`
      : "/");

  let targetUrl = self.location.origin + "/";

  try {
    const candidateUrl = new URL(rawUrl, self.location.origin);
    if (candidateUrl.origin === self.location.origin) {
      targetUrl = candidateUrl.href;
    }
  } catch {}

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            await client.focus();

            client.postMessage({
              type: "OPEN_INCIDENT_DETAIL",
              url: targetUrl,
            });

            if ("navigate" in client) {
              await client.navigate(targetUrl);
            }
            return;
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
