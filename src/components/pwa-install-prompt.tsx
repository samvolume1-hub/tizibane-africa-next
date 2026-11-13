"use client";

import { useEffect, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };

    const updateInstalledState = () => {
      const installed = displayMode.matches || standaloneNavigator.standalone === true;
      setIsInstalled(installed);
      if (installed) setInstallEvent(null);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    updateInstalledState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayMode.addEventListener?.("change", updateInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayMode.removeEventListener?.("change", updateInstalledState);
    };
  }, []);

  async function installApp() {
    if (!installEvent || isInstalling) return;

    setIsInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") setIsInstalled(true);
    } catch (error) {
      console.warn("[TIZIBANE PWA] install prompt could not be completed", error);
      setInstallEvent(null);
    } finally {
      setIsInstalling(false);
    }
  }

  if (!installEvent || isInstalled) return null;

  return (
    <div
      className="tizibane-pwa-install"
      role="region"
      aria-label="Install TIZIBANE"
    >
      <button
        type="button"
        onClick={installApp}
        disabled={isInstalling}
        aria-label="Install TIZIBANE as an app"
        title="Install TIZIBANE"
      >
        <span className="tizibane-pwa-install-icon" aria-hidden="true">↓</span>
        <span>{isInstalling ? "Opening install…" : "Install TIZIBANE"}</span>
      </button>
    </div>
  );
}
