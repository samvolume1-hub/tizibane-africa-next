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
  volume: 0.42,
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
      <p style={{ color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.6, margin: "8px 0 18px", maxWidth: 660 }}>
        Soft, warm notification chimes with a little ambience. Choose sound and vibration independently. These preferences are saved on this device.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,.055)" }}>
          <span><strong style={{ display: "block", fontSize: 14 }}>Gentle sounds</strong><small style={{ color: "rgba(255,255,255,.62)" }}>Messages, reactions, groups and events</small></span>
          <input aria-label="Enable notification sounds" type="checkbox" checked={preferences.soundEnabled} onChange={(event) => {
            const enabled = event.target.checked;
            update({ soundEnabled: enabled });
            if (enabled) playNotificationSound("message", true);
          }} style={{ width: 20, height: 20, accentColor: "#c58be8" }} />
        </label>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,.055)" }}>
          <span><strong style={{ display: "block", fontSize: 14 }}>Vibration</strong><small style={{ color: "rgba(255,255,255,.62)" }}>A very short, subtle pulse where supported</small></span>
          <input aria-label="Enable notification vibration" type="checkbox" checked={preferences.vibrationEnabled} onChange={(event) => {
            const enabled = event.target.checked;
            update({ vibrationEnabled: enabled });
            if (enabled) vibrateForNotification(28);
          }} style={{ width: 20, height: 20, accentColor: "#c58be8" }} />
        </label>

        <div style={{ padding: "12px 14px", borderRadius: 13, background: "rgba(255,255,255,.055)" }}>
          <label htmlFor="tizibane-sound-volume" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 650 }}>
            <span>Sound level</span><span>{Math.round(preferences.volume * 100)}%</span>
          </label>
          <input id="tizibane-sound-volume" type="range" min="0.1" max="0.75" step="0.05" value={preferences.volume} onChange={(event) => update({ volume: Number(event.target.value) })} disabled={!preferences.soundEnabled} style={{ width: "100%", marginTop: 10, accentColor: "#d2a5ec" }} />
          <small style={{ color: "rgba(255,255,255,.58)" }}>Kept deliberately soft by default.</small>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15 }}>
        <button type="button" onClick={() => playNotificationSound("message", true)} style={buttonStyle}>Preview message chime</button>
        <button type="button" onClick={() => playNotificationSound("voice_call", true)} style={buttonStyle}>Preview voice-call tone</button>
        <button type="button" onClick={() => playNotificationSound("video_call", true)} style={buttonStyle}>Preview video-call tone</button>
        <button type="button" onClick={() => vibrateForNotification([34, 65, 34])} style={buttonStyle}>Test vibration</button>
      </div>
      <p role="status" style={{ margin: "13px 0 0", color: "rgba(255,255,255,.55)", fontSize: 11, lineHeight: 1.5 }}>
        Your browser may require one tap on a preview before it allows sounds. Vibration depends on the phone, browser and device settings; iPhones and some desktop browsers do not expose web vibration.
      </p>
    </section>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(221, 184, 244, .38)",
  borderRadius: 999,
  background: "rgba(153, 98, 190, .16)",
  color: "#fff",
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 650,
  cursor: "pointer",
};
