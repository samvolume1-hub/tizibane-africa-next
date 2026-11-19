import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const soundLibrary = readFileSync("src/lib/notification-sounds.ts", "utf8");
const listener = readFileSync("src/components/notification-sound-listener.tsx", "utf8");
const settings = readFileSync("src/components/notification-sound-settings.tsx", "utf8");

test("default vibration is enabled and uses exactly six strong pulses", () => {
  assert.match(soundLibrary, /vibrationEnabled:\s*true/);
  assert.match(soundLibrary, /DEFAULT_NOTIFICATION_VIBRATION_PATTERN\s*=\s*\[120, 85, 120, 85, 120, 85, 120, 85, 120, 85, 120\]/);
  assert.match(soundLibrary, /vibrateForNotification\(pattern: number \| number\[\] = DEFAULT_NOTIFICATION_VIBRATION_PATTERN\)/);
});

test("messages, community alerts and incoming calls all use the shared six-pulse default", () => {
  assert.match(listener, /playNotificationSound\("message", false, 6\);\s*vibrateForNotification\(\);/);
  assert.match(listener, /playNotificationSound\(notificationSoundKind\(notification\.kind \?\? ""\), false, 6\);\s*vibrateForNotification\(\);/);
  assert.match(listener, /playNotificationSound\(kind\);\s*vibrateForNotification\(\);/);
  assert.doesNotMatch(listener, /vibrateForNotification\(\s*(?:\d+|\[)/);
});

test("members can turn vibration off and the test button previews the full pattern", () => {
  assert.match(settings, /checked=\{preferences\.vibrationEnabled\}/);
  assert.match(settings, /update\(\{ vibrationEnabled: enabled \}\)/);
  assert.match(settings, /Test six-pulse vibration/);
  assert.match(settings, /onClick=\{\(\) => vibrateForNotification\(\)\}/);
});
