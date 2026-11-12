"use client";

import { useEffect } from "react";

/**
 * Quietly checks the cached Spotlight feeds while a signed-in member is using
 * TIZIBANE. The database serializes and rate-limits global syncs, so many open
 * tabs or members do not create duplicate notifications.
 */
export function SpotlightNotificationSync() {
  useEffect(() => {
    let active = true;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/spotlight-notifications", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => {
        // Feed checks are best-effort; the app and its existing notifications
        // must remain usable when an external publisher is temporarily offline.
      });
    };

    sync();
    const interval = window.setInterval(sync, 15 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
