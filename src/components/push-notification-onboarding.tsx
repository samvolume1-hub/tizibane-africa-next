"use client";

import { useEffect, useState } from "react";
import { saveWebPushSubscription } from "@/app/home/push-actions";

type Props = { userId: string; vapidPublicKey: string };
type ViewState = "checking" | "prompt" | "working" | "enabled" | "denied" | "ios-install" | "error" | "hidden";

const OWNER_STORAGE_KEY = "tizibane-web-push-owner";
const DISMISSED_STORAGE_KEY = "tizibane-push-onboarding-dismissed";

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIosHomeScreenApp() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
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
        const permission = Notification.permission;
        if (permission === "denied") {
          if (active) setState("denied");
          return;
        }

        if (permission !== "granted") {
          let dismissed = false;
          try { dismissed = window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "1"; } catch { /* Storage may be unavailable. */ }
          if (active) setState(dismissed ? "hidden" : isIosHomeScreenApp() ? "ios-install" : "prompt");
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
          window.sessionStorage.removeItem(DISMISSED_STORAGE_KEY);
        } catch { /* The server subscription remains valid without browser storage. */ }
        if (active) setState("enabled");
      } catch (error) {
        console.error("[TIZIBANE push onboarding] setup failed", error);
        if (active) {
          setMessage("We couldn't finish setting up notifications on this device. You can try again from Notifications.");
          setState("error");
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
      const permission = await Notification.requestPermission();
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
        window.sessionStorage.removeItem(DISMISSED_STORAGE_KEY);
      } catch { /* The server subscription remains valid without browser storage. */ }
      setState("enabled");
    } catch (error) {
      console.error("[TIZIBANE push onboarding] permission setup failed", error);
      setMessage("Notifications couldn't be enabled just now. Please try again from your Notifications page.");
      setState("error");
    }
  }

  function dismiss() {
    try { window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "1"); } catch { /* Ignore unavailable storage. */ }
    setState("hidden");
  }

  if (state === "checking" || state === "hidden" || state === "enabled" || state === "denied") return null;

  const cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 90,
    right: "max(18px, env(safe-area-inset-right))",
    bottom: "max(18px, env(safe-area-inset-bottom))",
    width: "min(390px, calc(100vw - 28px))",
    padding: "20px",
    borderRadius: 22,
    border: "1px solid rgba(224, 190, 246, .38)",
    background: "linear-gradient(145deg, #382047 0%, #21152e 100%)",
    color: "#fff",
    boxShadow: "0 22px 70px rgba(8, 3, 18, .42)",
    fontFamily: "inherit",
  };

  return (
    <aside aria-labelledby="push-onboarding-title" role="region" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span aria-hidden="true" style={{
          display: "grid", placeItems: "center", flex: "0 0 42px", height: 42,
          borderRadius: 14, background: "rgba(220, 174, 246, .16)", color: "#f0d8ff", fontSize: 21,
        }}>♢</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ color: "#d9b8ed", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>STAY IN THE LOOP</span>
          <h2 id="push-onboarding-title" style={{ margin: "4px 0 6px", color: "#fff", fontSize: 18, lineHeight: 1.2 }}>
            {state === "ios-install" ? "Add TIZIBANE to your Home Screen" : "Never miss a moment"}
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
          : "Get timely alerts for messages, friend requests, group activity and community updates—even when TIZIBANE isn't open. Your private message contents stay private."}
      </p>

      {state !== "ios-install" && (
        <button type="button" onClick={enableNotifications} disabled={state === "working"} style={{
          width: "100%", border: "1px solid rgba(255,255,255,.2)", borderRadius: 999,
          padding: "12px 18px", background: "linear-gradient(100deg, #9a55bd, #67318b)",
          color: "#fff", fontSize: 13, fontWeight: 800, cursor: state === "working" ? "wait" : "pointer",
          boxShadow: "0 8px 22px rgba(12, 4, 20, .24)",
        }}>
          {state === "working" ? "Setting up your alerts…" : "Turn on my notifications"}
        </button>
      )}

      {state === "error" && <p role="status" aria-live="polite" style={{ color: "#f5d7a7", fontSize: 12, lineHeight: 1.5, margin: "10px 0 0" }}>{message}</p>}
    </aside>
  );
}
