"use client";

import { useEffect, useState } from "react";
import { removeWebPushSubscription, saveWebPushSubscription } from "@/app/home/push-actions";

type Props = { vapidPublicKey: string };
type PushState = "checking" | "unsupported" | "not-configured" | "off" | "on" | "working" | "error";

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isIosHomeScreenApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !navigatorWithStandalone.standalone
    && !window.matchMedia("(display-mode: standalone)").matches;
}

export function PushNotificationSettings({ vapidPublicKey }: Props) {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [iosInstallRequired, setIosInstallRequired] = useState(false);

  useEffect(() => {
    let active = true;
    async function inspect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setState("unsupported");
        return;
      }
      if (!vapidPublicKey) {
        if (active) setState("not-configured");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        if (active) {
          setState(subscription ? "on" : "off");
          setIosInstallRequired(isIosHomeScreenApp());
        }
      } catch {
        if (active) setState("error");
      }
    }
    void inspect();
    return () => { active = false; };
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey || state === "working") return;
    if (isIosHomeScreenApp()) {
      setIosInstallRequired(true);
      setMessage("On iPhone or iPad, first add TIZIBANE to your Home Screen, then open it from its new icon and enable notifications here.");
      return;
    }
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("off");
        setMessage(permission === "denied"
          ? "Notifications are blocked for this site. Change the permission in your browser or phone settings, then try again."
          : "Notification permission was not granted. You can enable it whenever you are ready.");
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
      if (!saved.ok) {
        await subscription.unsubscribe();
        setState("off");
        setMessage(saved.message);
        return;
      }
      setState("on");
      setMessage(saved.message);
    } catch (error) {
      console.error("[TIZIBANE push] enable failed", error);
      setState("error");
      setMessage("Notifications could not be enabled on this device. Please check your connection and try again.");
    }
  }

  async function disable() {
    if (state === "working") return;
    setState("working");
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        const removed = await removeWebPushSubscription(subscription.endpoint);
        if (!removed.ok) {
          setState("on");
          setMessage(removed.message);
          return;
        }
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Push notifications are switched off on this device.");
    } catch {
      setState("error");
      setMessage("We could not switch off notifications on this device. Please try again.");
    }
  }

  const busy = state === "working" || state === "checking";
  const buttonStyle: React.CSSProperties = {
    border: "1px solid rgba(226,190,245,.34)",
    borderRadius: 999,
    padding: "10px 17px",
    color: "#fff",
    background: "#54246f",
    fontWeight: 700,
    cursor: busy || state === "unsupported" || state === "not-configured" ? "not-allowed" : "pointer",
    opacity: busy || state === "unsupported" || state === "not-configured" ? .65 : 1,
  };

  return (
    <section aria-labelledby="push-notifications-title" style={{
      margin: "22px 0 30px",
      padding: "20px clamp(16px, 3vw, 26px)",
      borderRadius: 20,
      border: "1px solid rgba(205, 166, 235, .24)",
      background: "linear-gradient(135deg, rgba(43, 24, 60, .88), rgba(24, 16, 37, .94))",
      boxShadow: "0 16px 42px rgba(8, 3, 18, .18)",
      color: "#fff",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ fontSize: 22, color: "#e4c4f2" }}>♢</span>
        <div>
          <span style={{ display: "block", color: "#d8b6eb", fontSize: 10, letterSpacing: ".18em", fontWeight: 700 }}>STAY CONNECTED</span>
          <h2 id="push-notifications-title" style={{ margin: "3px 0 0", fontSize: 20, color: "#fff" }}>Phone & browser notifications</h2>
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,.74)", fontSize: 13, lineHeight: 1.65, margin: "8px 0 16px", maxWidth: 700 }}>
        Get a discreet alert when someone connects with you, comments on your post or shares a community update. Private message contents are never included.
      </p>
      {state === "on" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span role="status" style={{ color: "#b8edcf", fontSize: 13, fontWeight: 700 }}>✓ This device is enabled</span>
          <button type="button" onClick={disable} disabled={busy} style={buttonStyle}>Turn off on this device</button>
        </div>
      ) : (
        <button type="button" onClick={enable} disabled={busy || state === "unsupported" || state === "not-configured"} style={buttonStyle}>
          {state === "checking" || state === "working" ? "Please wait…" : "Enable phone notifications"}
        </button>
      )}
      {state === "not-configured" && <p style={{ color: "#f1d7a6", fontSize: 12, margin: "12px 0 0" }}>Phone notifications are being prepared and are not active yet.</p>}
      {state === "unsupported" && <p style={{ color: "#f1d7a6", fontSize: 12, margin: "12px 0 0" }}>This browser does not support web push notifications. Try a current version of Chrome, Edge, Firefox or Safari.</p>}
      {iosInstallRequired && <p style={{ color: "rgba(255,255,255,.76)", fontSize: 12, lineHeight: 1.6, margin: "12px 0 0" }}>For iPhone and iPad, add TIZIBANE to your Home Screen and open it from that icon before enabling notifications.</p>}
      {message && <p role="status" aria-live="polite" style={{ color: "rgba(255,255,255,.82)", fontSize: 12, lineHeight: 1.6, margin: "12px 0 0" }}>{message}</p>}
    </section>
  );
}
