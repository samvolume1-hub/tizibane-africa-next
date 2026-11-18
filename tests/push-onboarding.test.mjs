import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboarding = readFileSync("src/components/push-notification-onboarding.tsx", "utf8");
const positioning = readFileSync("src/components/push-notification-onboarding.module.css", "utf8");

test("notification invitation dismissal persists per signed-in user", () => {
  assert.match(onboarding, /function dismissedStorageKey\(userId: string\)/);
  assert.match(onboarding, /localStorage\.getItem\(dismissedStorageKey\(userId\)\)/);
  assert.match(onboarding, /localStorage\.setItem\(dismissedStorageKey\(userId\), "1"\)/);
  assert.match(onboarding, /localStorage\.removeItem\(dismissedStorageKey\(userId\)\)/);
  assert.match(onboarding, /dismissed = window\.sessionStorage\.getItem\(DISMISSED_STORAGE_KEY\) === "1"/);
});

test("dismissal is checked before showing either prompt or denied-permission guidance", () => {
  const permissionBranch = onboarding.indexOf('if (permission !== "granted")');
  const dismissalCheck = onboarding.indexOf('localStorage.getItem(dismissedStorageKey(userId))');
  const deniedState = onboarding.indexOf('permission === "denied" ? "denied"');
  assert.ok(permissionBranch >= 0 && dismissalCheck > permissionBranch);
  assert.ok(deniedState > dismissalCheck);
});

test("notification invitation layers above navigation and clears the mobile bottom bar", () => {
  assert.match(positioning, /z-index:\s*120/);
  assert.match(positioning, /bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom, 0px\) \+ 16px\)/);
  assert.match(positioning, /max-height:\s*calc\(100dvh - 112px/);
});
