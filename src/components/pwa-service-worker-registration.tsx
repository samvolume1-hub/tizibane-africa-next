"use client";

import { useEffect } from "react";

export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async () => {
      if (cancelled) return;
      try {
        // Registration is shared with Web Push: using the same script and scope
        // reuses the existing registration on devices that already enabled alerts.
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("[TIZIBANE PWA] service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
