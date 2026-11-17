"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "tizibane-theme";

export function ThemeSettings() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let saved: Theme = "light";
    try {
      saved = window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      // Keep the accessible light default when browser storage is unavailable.
    }
    document.documentElement.dataset.theme = saved;
    setTheme(saved);
  }, []);

  function chooseTheme(nextTheme: Theme) {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The selection still applies for this visit if storage is restricted.
    }
  }

  return (
    <section className="theme-settings-card" aria-labelledby="theme-settings-title">
      <div className="theme-settings-copy">
        <span className="eyebrow">ACCESSIBILITY</span>
        <h2 id="theme-settings-title">Appearance</h2>
        <p>Choose the display that feels most comfortable. Your choice is saved on this device and can be changed at any time.</p>
      </div>
      <div className="theme-choice-group" role="group" aria-label="Choose app appearance">
        <button
          type="button"
          className={`theme-choice-button${theme === "light" ? " is-selected" : ""}`}
          aria-pressed={theme === "light"}
          onClick={() => chooseTheme("light")}
        >
          <span className="theme-choice-preview theme-choice-preview-light" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Light mode</strong><small>Default appearance</small></span>
          {theme === "light" && <span className="theme-choice-check" aria-hidden="true">✓</span>}
        </button>
        <button
          type="button"
          className={`theme-choice-button${theme === "dark" ? " is-selected" : ""}`}
          aria-pressed={theme === "dark"}
          onClick={() => chooseTheme("dark")}
        >
          <span className="theme-choice-preview theme-choice-preview-dark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Dark mode</strong><small>A darker, softer display</small></span>
          {theme === "dark" && <span className="theme-choice-check" aria-hidden="true">✓</span>}
        </button>
      </div>
      <p className="theme-settings-note" role="status">Currently using {theme === "dark" ? "dark" : "light"} mode.</p>
    </section>
  );
}
