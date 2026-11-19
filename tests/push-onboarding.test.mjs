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

test("a granted browser permission never falls back to the enable invitation after silent subscription sync fails", () => {
  assert.match(onboarding, /if \("Notification" in window && Notification\.permission === "granted"\)\s*\{\s*setState\("hidden"\)/);
  assert.match(onboarding, /const permission = Notification\.permission === "granted"\s*\? "granted"\s*:\s*await Notification\.requestPermission\(\)/);
});

test("notification invitation layers above navigation and clears the mobile bottom bar", () => {
  assert.match(positioning, /z-index:\s*120/);
  assert.match(positioning, /bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom, 0px\) \+ 16px\)/);
  assert.match(positioning, /max-height:\s*calc\(100dvh - 112px/);
});

test("desktop Settings and Sign out controls live in the left sidebar", () => {
  const navigation = readFileSync("src/components/community-navigation.tsx", "utf8");
  const appControls = readFileSync("src/components/app-page-controls.tsx", "utf8");
  const styles = readFileSync("src/components/community-navigation.module.css", "utf8");
  assert.match(navigation, /className=\{styles\.sidebarActions\}/);
  assert.match(navigation, /href="\/home\/settings"/);
  assert.match(navigation, /className=\{styles\.sidebarAction\} onClick=\{\(\) => setConfirmSidebarLogout\(true\)\}/);
  assert.match(appControls, /filter\(\(item\) => item\.key !== "settings"\)/);
  assert.doesNotMatch(appControls, /Sign out/);
  assert.match(styles, /\.sidebarActions/);
  assert.match(styles, /@media \(max-width: 820px\) \{\s*\.sidebarActions \{ display: none;/);
});
