import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboarding = readFileSync("src/components/push-notification-onboarding.tsx", "utf8");
const pushActions = readFileSync("src/app/home/push-actions.ts", "utf8");
const layout = readFileSync("src/app/home/layout.tsx", "utf8");
const positioning = readFileSync("src/components/push-notification-onboarding.module.css", "utf8");

test("notification invitation dismissal is stored in the authenticated account metadata", () => {
  assert.match(pushActions, /export async function dismissPushNotificationOnboarding/);
  assert.match(pushActions, /supabase\.auth\.updateUser/);
  assert.match(pushActions, /tizibane_push_onboarding_dismissed:\s*true/);
  assert.match(layout, /user_metadata\?\.tizibane_push_onboarding_dismissed === true/);
  assert.match(layout, /user && !hasDismissedPushOnboarding/);
  assert.match(onboarding, /await dismissPushNotificationOnboarding\(\)/);
});

test("dismissal is checked before showing permission or installation guidance", () => {
  const legacyMigration = onboarding.indexOf("let legacyDismissed = false");
  const permissionBranch = onboarding.indexOf('if (permission !== "granted")');
  assert.ok(legacyMigration >= 0 && permissionBranch > legacyMigration);
  assert.match(onboarding, /setState\(permission === "denied" \? "denied"/);
});

test("notification invitation layers above navigation and clears the mobile bottom bar", () => {
  assert.match(positioning, /z-index:\s*120/);
  assert.match(positioning, /bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom, 0px\) \+ 16px\)/);
  assert.match(positioning, /max-height:\s*calc\(100dvh - 112px/);
});
