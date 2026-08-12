const SERVICE_WORKER_URL = "/firebase-messaging-sw.js";

export async function registerKoksaiPWA() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!window.isSecureContext && window.location.hostname !== "localhost") return null;

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none",
    });

    window.addEventListener("focus", () => {
      registration.update().catch(() => undefined);
    });

    return registration;
  } catch (error) {
    console.error("PWA register error", error);
    return null;
  }
}
