"use client";

import { useEffect, useState } from "react";
import styles from "./install-app-button.module.css";

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const appleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(appleMobile);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (isIos) {
      setShowInstructions(true);
      return;
    }
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch {
      // If the browser's native prompt is unavailable or expires, keep a usable manual route.
      setInstallPrompt(null);
      setShowInstructions(true);
    }
  }

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        className={styles.installButton}
        onClick={() => void installApp()}
        aria-haspopup="dialog"
      >
        <svg className={styles.downloadIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.75v10.5m0 0 4.1-4.1M12 14.25l-4.1-4.1M5 16.75v2.5h14v-2.5" />
        </svg>
        <span>Install TIZIBANE</span>
        <span className={styles.buttonArrow} aria-hidden="true">↓</span>
      </button>

      {showInstructions && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowInstructions(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(8,4,14,.72)",
            backdropFilter: "blur(5px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tizibane-install-title"
            style={{
              width: "min(100%,420px)",
              padding: 24,
              border: "1px solid rgba(220,190,240,.35)",
              borderRadius: 22,
              background: "linear-gradient(145deg,#382047,#1b1226)",
              color: "#fff",
              boxShadow: "0 24px 80px rgba(0,0,0,.45)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              aria-label="Close installation instructions"
              style={{
                float: "right",
                border: 0,
                background: "transparent",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <p style={{ margin: "0 0 7px", color: "#dfb8f3", fontSize: 10, fontWeight: 800, letterSpacing: ".16em" }}>
              TIZIBANE ON YOUR PHONE
            </p>
            <h2 id="tizibane-install-title" style={{ margin: "0 0 12px", fontSize: 22 }}>
              {isIos ? "Add TIZIBANE to your Home Screen" : "Install TIZIBANE"}
            </h2>
            <ol style={{ margin: 0, paddingLeft: 21, color: "rgba(255,255,255,.88)", fontSize: 14, lineHeight: 1.8 }}>
              {isIos ? (
                <>
                  <li>Tap the <strong>Share</strong> button in Safari.</li>
                  <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to finish.</li>
                </>
              ) : (
                <>
                  <li>Open your browser menu (usually <strong>⋮</strong> or <strong>⋯</strong>).</li>
                  <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, if offered.</li>
                  <li>Confirm <strong>Install</strong> or <strong>Add</strong>.</li>
                </>
              )}
            </ol>
            <p style={{ margin: "15px 0 0", color: "rgba(255,255,255,.68)", fontSize: 12, lineHeight: 1.6 }}>
              Open TIZIBANE from the new home-screen icon for an app-like experience.
            </p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              style={{
                width: "100%",
                marginTop: 18,
                padding: "12px 18px",
                border: 0,
                borderRadius: 999,
                background: "#e7c9f7",
                color: "#291634",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}
