"use client";

import { useEffect, useState } from "react";
import { dismissPushNotificationOnboarding, saveWebPushSubscription } from "@/app/home/push-actions";
import styles from "./push-notification-onboarding.module.css";

type Props = { userId: string; vapidPublicKey: string };
type ViewState = "checking" | "prompt" | "working" | "enabled" | "denied" | "ios-install" | "error" | "hidden";

const OWNER_STORAGE_KEY = "tizibane-web-push-owner";
const DISMISSED_STORAGE_KEY = "tizibane-push-onboarding-dismissed";

function dismissedStorageKey(userId: string) {
  return DISMISSED_STORAGE_KEY + ":" + userId;
}

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIosHomeScreenApp() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isAppleMobile
    && !standaloneNavigator.standalone
    && !window.matchMedia("(display-mode: standalone)").matches;
}

export function PushNotificationOnboarding({ userId, vapidPublicKey }: Props) {
  const [state, setState] = useState<ViewState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function prepare() {
      if (!userId || !vapidPublicKey) {
        if (active) setState("hidden");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setState("hidden");
        return;
      }

      try {
        // Migrate any dismissal saved by an earlier browser-only version into
        // the signed-in account, then rely on account metadata on future visits.
        let legacyDismissed = false;
        try {
          legacyDismissed = window.localStorage.getItem(dismissedStorageKey(userId)) === "1"
            || window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
        } catch { /* Account metadata remains the durable source of truth. */ }
        if (legacyDismissed) {
          const saved = await dismissPushNotificationOnboarding();
          if (active) setState("hidden");
          if (!saved.ok) console.warn("[TIZIBANE push] legacy dismissal could not be migrated");
          return;
        }

        const permission = Notification.permission;
        if (permission !== "granted") {
          if (active) {
            setState(permission === "denied" ? "denied" : isIosHomeScreenApp() ? "ios-install" : "prompt");
          }
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        let savedOwner = "";
        try { savedOwner = window.localStorage.getItem(OWNER_STORAGE_KEY) ?? ""; } catch { /* Storage may be unavailable. */ }
        if (subscription && savedOwner && savedOwner !== userId) {
          await subscription.unsubscribe();
          subscription = null;
        }

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeApplicationServerKey(vapidPublicKey),
          });
        }

        const saved = await saveWebPushSubscription(subscription.toJSON());
        if (!saved.ok) throw new Error(saved.message);
        try {
          window.localStorage.setItem(OWNER_STORAGE_KEY, userId);
          window.localStorage.removeItem(dismissedStorageKey(userId));
          window.sessionStorage.removeItem(DISMISSED_STORAGE_KEY);
        } catch { /* The server subscription remains valid without browser storage. */ }
        if (active) setState("enabled");
      } catch (error) {
        console.error("[TIZIBANE push onboarding] setup failed", error);
        if (active) {
          // Browser permission is already granted. Never show an enable-permission
          // invitation again just because subscription sync failed; retry silently
          // on a later authenticated visit instead.
          if ("Notification" in window && Notification.permission === "granted") {
            setState("hidden");
          } else {
            setMessage("We couldn't finish setting up notifications on this device. You can try again from Notifications.");
            setState("error");
          }
        }
      }
    }

    void prepare();
    return () => { active = false; };
  }, [userId, vapidPublicKey]);

  async function enableNotifications() {
    if (state === "working") return;
    if (isIosHomeScreenApp()) {
      setState("ios-install");
      return;
    }

    setState("working");
    setMessage("");
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "prompt");
        setMessage(permission === "denied"
          ? "Your browser blocked notifications. You can allow them in this site's browser settings."
          : "No problem. You can turn notifications on later from your Notifications page.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(vapidPublicKey),
        });
      }
      const saved = await saveWebPushSubscription(subscription.toJSON());
      if (!saved.ok) throw new Error(saved.message);

      try {
        window.localStorage.setItem(OWNER_STORAGE_KEY, userId);
        window.localStorage.removeItem(dismissedStorageKey(userId));
        window.sessionStorage.removeItem(DISMISSED_STORAGE_KEY);
      } catch { /* The server subscription remains valid without browser storage. */ }
      setState("enabled");
    } catch (error) {
      console.error("[TIZIBANE push onboarding] permission setup failed", error);
      setMessage("Notifications couldn't be enabled just now. Please try again from your Notifications page.");
      setState("error");
    }
  }

  async function dismiss() {
    // Hide immediately; persist the choice against the authenticated account so
    // it survives browser restarts, storage restrictions, and other devices.
    setState("hidden");
    const saved = await dismissPushNotificationOnboarding();
    if (!saved.ok) {
      // Best-effort fallback for this browser if the account update is unavailable.
      try { window.localStorage.setItem(dismissedStorageKey(userId), "1"); } catch { /* Browser storage may be unavailable too. */ }
      console.warn("[TIZIBANE push] account dismissal preference was not saved");
    }
  }

  if (state === "checking" || state === "hidden" || state === "enabled") return null;

  const cardStyle: React.CSSProperties = {
    padding: "20px",
    borderRadius: 22,
    border: "1px solid rgba(224, 190, 246, .38)",
    background: "linear-gradient(145deg, #382047 0%, #21152e 100%)",
    color: "#fff",
    boxShadow: "0 22px 70px rgba(8, 3, 18, .42)",
    fontFamily: "inherit",
  };

  return (
    <aside aria-labelledby="push-onboarding-title" role="region" className={styles.card} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span aria-hidden="true" style={{
          display: "grid", placeItems: "center", flex: "0 0 42px", height: 42,
          borderRadius: 14, background: "rgba(220, 174, 246, .16)", color: "#f0d8ff", fontSize: 21,
        }}>♢</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ color: "#d9b8ed", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>STAY IN THE LOOP</span>
          <h2 id="push-onboarding-title" style={{ margin: "4px 0 6px", color: "#fff", fontSize: 18, lineHeight: 1.2 }}>
            {state === "ios-install" ? "Add TIZIBANE to your Home Screen" : state === "denied" ? "Allow notifications in your browser" : "Never miss a moment"}
          </h2>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss notification invitation" style={{
          border: 0, background: "transparent", color: "rgba(255,255,255,.7)", fontSize: 22,
          lineHeight: 1, cursor: "pointer", padding: "0 2px",
        }}>×</button>
      </div>

      <p style={{ color: "rgba(255,255,255,.82)", fontSize: 13, lineHeight: 1.6, margin: "10px 0 16px" }}>
        {state === "ios-install"
          ? "On iPhone or iPad, tap Share, choose Add to Home Screen, then open TIZIBANE from its new icon. You can enable alerts there."
          : state === "denied" ? "Notifications are currently blocked for this site. Open your browser or device site settings, change Notifications to Allow, then return to TIZIBANE." : "Get timely alerts for messages, friend requests, group activity and community updates—even when TIZIBANE isn't open. Your private message contents stay private."}
      </p>

      {state === "denied" ? (
        <a href="/home/notifications" style={{ display: "block", textAlign: "center", textDecoration: "none", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "12px 18px", background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 13, fontWeight: 800 }}>Open notification settings</a>
      ) : state !== "ios-install" && (
        <button type="button" onClick={enableNotifications} disabled={state === "working"} style={{
          width: "100%", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999,
          padding: "12px 18px", background: "linear-gradient(100deg, #9a55bd, #67318b)",
          color: "#fff", fontSize: 13, fontWeight: 800, cursor: state === "working" ? "wait" : "pointer",
          boxShadow: "0 8px 22px rgba(12, 4, 20, .24)",
        }}>
          {state === "working" ? "Setting up your alerts…" : "Turn on my notifications"}
        </button>
      )}

      {message && <p role="status" aria-live="polite" style={{ color: "#f5d7a7", fontSize: 12, lineHeight: 1.5, margin: "10px 0 0" }}>{message}</p>}
    </aside>
  );
}
