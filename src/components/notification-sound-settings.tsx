"use client";

import { useEffect, useState } from "react";
import {
  playNotificationSound,
  readNotificationPreferences,
  saveNotificationPreferences,
  vibrateForNotification,
  type NotificationPreferences,
} from "@/lib/notification-sounds";

const initialPreferences: NotificationPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  volume: 0.6,
};

export function NotificationSoundSettings() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreferences(readNotificationPreferences());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveNotificationPreferences(preferences);
  }, [preferences, ready]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  };

  return (
    <section
      aria-labelledby="notification-sound-title"
      style={{
        margin: "22px 0 30px",
        padding: "20px clamp(16px, 3vw, 26px)",
        borderRadius: 20,
        border: "1px solid rgba(205, 166, 235, .24)",
        background: "linear-gradient(135deg, rgba(43, 24, 60, .88), rgba(24, 16, 37, .94))",
        boxShadow: "0 16px 42px rgba(8, 3, 18, .18)",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ fontSize: 22, color: "#e4c4f2" }}>♫</span>
        <div>
          <span style={{ display: "block", color: "#d8b6eb", fontSize: 10, letterSpacing: ".18em", fontWeight: 700 }}>YOUR TIZIBANE EXPERIENCE</span>
          <h2 id="notification-sound-title" style={{ margin: "3px 0 0", fontSize: 20, color: "#fff" }}>Sound & vibration</h2>
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,.76)", fontSize: 13, lineHeight: 1.6, margin: "8px 0 18px", maxWidth: 660 }}>
        Set how loudly TIZIBANE alerts you. New devices start at 60%; adjust the level any time. Sound and vibration work independently, and your choices are saved on this device.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,.055)" }}>
          <span><strong style={{ display: "block", fontSize: 14 }}>Notification sounds</strong><small style={{ color: "rgba(255,255,255,.68)" }}>Messages, reactions, groups, events and calls</small></span>
          <input aria-label="Enable notification sounds" type="checkbox" checked={preferences.soundEnabled} onChange={(event) => {
            const enabled = event.target.checked;
            update({ soundEnabled: enabled });
            if (enabled) playNotificationSound("message", true);
          }} style={{ width: 20, height: 20, accentColor: "#c58be8" }} />
        </label>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,.055)" }}>
          <span><strong style={{ display: "block", fontSize: 14 }}>Vibration</strong><small style={{ color: "rgba(255,255,255,.68)" }}>A separate alert where your device supports it</small></span>
          <input aria-label="Enable notification vibration" type="checkbox" checked={preferences.vibrationEnabled} onChange={(event) => {
            const enabled = event.target.checked;
            update({ vibrationEnabled: enabled });
            if (enabled) vibrateForNotification([55, 70, 55]);
          }} style={{ width: 20, height: 20, accentColor: "#c58be8" }} />
        </label>

        <div style={{ padding: "14px", borderRadius: 13, background: "rgba(255,255,255,.065)" }}>
          <label htmlFor="tizibane-sound-volume" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, fontWeight: 750 }}>
            <span>Alert volume</span><span style={{ color: "#f0d5ff", fontVariantNumeric: "tabular-nums" }}>{Math.round(preferences.volume * 100)}%</span>
          </label>
          <input id="tizibane-sound-volume" type="range" min="0" max="1" step="0.05" value={preferences.volume} onChange={(event) => update({ volume: Number(event.target.value) })} disabled={!preferences.soundEnabled} style={{ width: "100%", marginTop: 12, accentColor: "#e0b4fa", cursor: preferences.soundEnabled ? "pointer" : "not-allowed" }} />
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.62)", fontSize: 11 }}>
            <span>Muted · 0%</span><span>Maximum · 100%</span>
          </div>
          <small style={{ display: "block", color: "rgba(255,255,255,.7)", marginTop: 8 }}>Recommended starting level: 60%. Move the slider and preview a tone to find your comfortable level.</small>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15 }}>
        <button type="button" onClick={() => playNotificationSound("message", true)} style={buttonStyle}>Preview message</button>
        <button type="button" onClick={() => playNotificationSound("voice_call", true)} style={buttonStyle}>Preview voice-call ring</button>
        <button type="button" onClick={() => playNotificationSound("video_call", true)} style={buttonStyle}>Preview video-call ring</button>
        <button type="button" onClick={() => vibrateForNotification([55, 70, 55])} style={buttonStyle}>Test vibration</button>
      </div>
      <p role="status" style={{ margin: "13px 0 0", color: "rgba(255,255,255,.62)", fontSize: 11, lineHeight: 1.5 }}>
        If a preview is silent, tap a preview button once to grant the browser audio permission. Also check your device's media volume and silent mode. Vibration support depends on the device and browser.
      </p>
    </section>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(221, 184, 244, .48)",
  borderRadius: 999,
  background: "rgba(153, 98, 190, .22)",
  color: "#fff",
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
