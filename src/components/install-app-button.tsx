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
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncInstalledState = () => {
      setInstalled(displayMode.matches || standaloneNavigator.standalone === true);
    };
    syncInstalledState();

    const appleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(appleMobile);
    setIsAndroid(/android/i.test(navigator.userAgent));

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    // Register the existing site worker; do not replace or create another worker.
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("[TIZIBANE install] service worker registration unavailable", error);
      });
    }

    displayMode.addEventListener?.("change", syncInstalledState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      displayMode.removeEventListener?.("change", syncInstalledState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);
        if (choice.outcome === "accepted") setInstalled(true);
        else setShowInstructions(true);
        return;
      } catch (error) {
        console.warn("[TIZIBANE install] native install prompt could not open", error);
        setInstallPrompt(null);
      }
    }
    setShowInstructions(true);
  }

  if (installed) return null;

  return (
    <section className={styles.installSection} aria-labelledby="tizibane-install-heading">
      <div className={styles.installCard}>
        <div className={styles.installCopy}>
          <span className={styles.installEyebrow}>YOUR COMMUNITY, ONE TAP AWAY</span>
          <h2 id="tizibane-install-heading">Take TIZIBANE with you.</h2>
          <p>Add TIZIBANE to your device&apos;s home screen or desktop for a convenient, app-like experience.</p>
        </div>
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
        </button>
      </div>

      {showInstructions && (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowInstructions(false);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tizibane-install-title"
          >
            <button
              type="button"
              className={styles.dialogClose}
              onClick={() => setShowInstructions(false)}
              aria-label="Close installation instructions"
            >
              ×
            </button>
            <p className={styles.dialogEyebrow}>TIZIBANE ON YOUR DEVICE</p>
            <h2 id="tizibane-install-title">
              {isIos ? "Add TIZIBANE to your Home Screen" : "Finish installing TIZIBANE"}
            </h2>
            <ol>
              {isIos ? (
                <>
                  <li>Open this page in <strong>Safari</strong>.</li>
                  <li>Tap the <strong>Share</strong> button.</li>
                  <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
                </>
              ) : isAndroid ? (
                <>
                  <li>Open this page in <strong>Chrome</strong> or another supported browser.</li>
                  <li>Tap the browser menu (<strong>⋮</strong>) and look for <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Select the option and confirm. The exact wording depends on your browser.</li>
                </>
              ) : (
                <>
                  <li>In <strong>Chrome</strong> or <strong>Edge</strong>, look for the Install icon at the right end of the address bar.</li>
                  <li>If it is not shown, open the browser menu and look for <strong>Install TIZIBANE</strong> or <strong>Install this site as an app</strong>.</li>
                  <li>Choose the option and confirm. If no install option is offered, that browser has not made this site available for installation.</li>
                </>
              )}
            </ol>
            <p className={styles.dialogNote}>
              TIZIBANE installs through your browser as a web app. It does not download a separate APK or Windows installer.
            </p>
            <button
              type="button"
              className={styles.dialogDone}
              onClick={() => setShowInstructions(false)}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
