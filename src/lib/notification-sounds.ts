"use client";

export type TizibaneSoundKind =
  | "message" | "like" | "comment" | "friend_request"
  | "group" | "event" | "voice_call" | "video_call";

export type NotificationPreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number;
};

const STORAGE_KEY = "tizibane.notification-preferences.v1";
const DEFAULTS: NotificationPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  volume: 0.6,
};

let audioContext: AudioContext | null = null;

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULTS;
    const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
    // 0.42 was the previous factory default. Move existing default installations
    // to the new 60% level while preserving any volume the member chose.
    const storedVolume = typeof parsed.volume === "number"
      ? (Math.abs(parsed.volume - 0.42) < 0.001 ? 0.6 : parsed.volume)
      : DEFAULTS.volume;
    return {
      soundEnabled: parsed.soundEnabled !== false,
      vibrationEnabled: parsed.vibrationEnabled !== false,
      volume: Math.min(1, Math.max(0, storedVolume)),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveNotificationPreferences(value: NotificationPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...value,
      volume: Math.min(1, Math.max(0, value.volume)),
    }));
  } catch {
    // Private browsing or storage restrictions should never break notifications.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return null;
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextConstructor();
  }
  return audioContext;
}

/**
 * Must be called directly from a real user gesture (pointer or keyboard).
 * Browsers commonly block Web Audio started by background Realtime callbacks
 * until the member has interacted with the page.
 */
export function unlockNotificationAudio(): Promise<boolean> {
  const context = getAudioContext();
  if (!context) return Promise.resolve(false);
  if (context.state === "running") return Promise.resolve(true);
  return context.resume()
    .then(() => context.state === "running")
    .catch(() => false);
}

function note(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  amplitude: number,
  wave: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), start + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.025);
}

const melodies: Record<TizibaneSoundKind, Array<[number, number, number]>> = {
  message: [[659.25, 0, 0.34], [880, 0.105, 0.42]],
  like: [[783.99, 0, 0.28]],
  comment: [[587.33, 0, 0.31], [739.99, 0.12, 0.34]],
  friend_request: [[523.25, 0, 0.34], [659.25, 0.13, 0.38], [783.99, 0.27, 0.48]],
  group: [[659.25, 0, 0.34], [783.99, 0.15, 0.34], [659.25, 0.3, 0.4]],
  event: [[587.33, 0, 0.38], [783.99, 0.18, 0.46]],
  // Lower, warmer two-part ring for voice; brighter three-note signature for video.
  voice_call: [[440, 0, 0.58], [554.37, 0.2, 0.62], [440, 0.52, 0.58]],
  video_call: [[587.33, 0, 0.5], [783.99, 0.18, 0.54], [987.77, 0.36, 0.62]],
};

export function playNotificationSound(kind: TizibaneSoundKind, preview = false, repeatCount = 1) {
  const preferences = readNotificationPreferences();
  if (!preview && !preferences.soundEnabled) return;
  if (preferences.volume <= 0) return;

  const context = getAudioContext();
  if (!context) return;

  const schedule = () => {
    // Never queue a notification that arrived while audio was locked. Otherwise
    // it could play unexpectedly much later when the member next taps the page.
    if (context.state !== "running") return;

    const now = context.currentTime + 0.025;
    // Previous output was capped at roughly 9.5% before the member volume was
    // applied, making even a 100% setting very quiet. This gives 60% a clear,
    // comfortable level while retaining a full 0–100% user control.
    const master = preferences.volume * 0.32;
    const melody = melodies[kind] ?? melodies.message;
    const repeats = preview ? 1 : Math.max(1, Math.min(6, Math.floor(repeatCount)));
    const melodyDuration = Math.max(...melody.map(([, offset, duration]) => offset + duration));

    for (let repeat = 0; repeat < repeats; repeat += 1) {
      const repeatStart = now + repeat * (melodyDuration + 0.22);
      melody.forEach(([frequency, offset, duration], index) => {
        const start = repeatStart + offset;
        const strength = index === 0 ? 1 : 0.82;
        note(context, frequency, start, duration, master * strength);
        note(context, frequency * 2, start + 0.012, duration * 0.72, master * 0.12, "sine");
        note(context, frequency / 2, start, duration * 0.8, master * 0.075, "sine");
      });
    }
  };

  if (context.state === "running") {
    schedule();
  } else if (preview) {
    // Preview buttons are explicit user actions, so they may request activation.
    void context.resume().then(schedule).catch(() => undefined);
  }
}

export function vibrateForNotification(pattern: number | number[] = 34) {
  const preferences = readNotificationPreferences();
  if (!preferences.vibrationEnabled || typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Unsupported devices and browser policies are intentionally silent.
  }
}

export function notificationSoundKind(kind: string): TizibaneSoundKind {
  if (kind === "reaction" || kind === "like") return "like";
  if (kind === "voice_call") return "voice_call";
  if (kind === "video_call") return "video_call";
  if (kind === "comment") return "comment";
  if (kind === "friend_request" || kind === "friend_accepted" || kind === "friend_declined" || kind === "follow") return "friend_request";
  if (kind.startsWith("group_")) return "group";
  if (kind.startsWith("event_")) return "event";
  return "message";
}
