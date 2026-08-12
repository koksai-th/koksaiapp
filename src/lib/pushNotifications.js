import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let listenersRegistered = false;
let currentTokenHandler = null;
let registrationResolve = null;
let registrationReject = null;

async function registerListenersOnce() {
  if (listenersRegistered) return;

  await PushNotifications.addListener("registration", async ({ value }) => {
    try {
      if (value && typeof currentTokenHandler === "function") {
        await currentTokenHandler(value);
      }
      registrationResolve?.(value || "");
    } catch (error) {
      registrationReject?.(error);
    } finally {
      registrationResolve = null;
      registrationReject = null;
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("Push notification registration failed:", error);
    registrationReject?.(error);
    registrationResolve = null;
    registrationReject = null;
  });

  await PushNotifications.addListener("pushNotificationReceived", () => {
    // Foreground presentation is controlled in capacitor.config.* via
    // PushNotifications.presentationOptions. The Supabase inbox is refreshed
    // separately through Realtime.
  });

  await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    const data = event?.notification?.data || {};
    const target = data.url || data.incident_url || "";
    if (!target || typeof window === "undefined") return;

    try {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) return;
      window.history.pushState(
  null,
  "",
  `${url.pathname}${url.search}${url.hash}`
);

window.dispatchEvent(
  new PopStateEvent("popstate")
);
    } catch {
      // Ignore malformed or untrusted notification URLs.
    }
  });

  listenersRegistered = true;
}

async function createAndroidNotificationChannel() {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await PushNotifications.createChannel({
      id: "emergency",
      name: "แจ้งเหตุฉุกเฉิน",
      description: "การแจ้งเหตุใหม่จากศูนย์สั่งการกู้ภัยกกไทร",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "default",
    });
  } catch (error) {
    // Channel may already exist on some Android versions. Registration can
    // continue because FCM has its own fallback channel.
    console.warn("Unable to create notification channel:", error);
  }
}

export async function initPushNotifications(onToken) {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, granted: false, token: "" };
  }

  currentTokenHandler = typeof onToken === "function" ? onToken : null;

  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      return { supported: true, granted: false, token: "" };
    }

    await registerListenersOnce();
    await createAndroidNotificationChannel();

    const tokenPromise = new Promise((resolve, reject) => {
      registrationResolve = resolve;
      registrationReject = reject;
    });

    await PushNotifications.register();

    const token = await Promise.race([
      tokenPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("หมดเวลารอ native push token")), 15000),
      ),
    ]);

    return { supported: true, granted: true, token: String(token || "") };
  } catch (error) {
    console.error("Unable to initialize push notifications:", error);
    return { supported: true, granted: false, token: "", error };
  }
}
