"use client";

import { useEffect, useState } from "react";

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
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed || (!installPrompt && !isIos)) return null;

  return (
    <>
      <button
        type="button"
        className="tizibane-install-app-button"
        onClick={() => void installApp()}
        aria-haspopup={isIos ? "dialog" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 40,
          padding: "10px 16px",
          border: "1px solid rgba(220,190,240,.55)",
          borderRadius: 999,
          background: "linear-gradient(120deg,#69417f,#432454)",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.2,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install app
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
              Add TIZIBANE to your Home Screen
            </h2>
            <ol style={{ margin: 0, paddingLeft: 21, color: "rgba(255,255,255,.88)", fontSize: 14, lineHeight: 1.8 }}>
              <li>Tap the <strong>Share</strong> button in Safari.</li>
              <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> to finish.</li>
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
