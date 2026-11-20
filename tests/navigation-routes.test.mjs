import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mobileNavigationItems,
  primaryNavigationItems,
  secondaryNavigationItems,
} from "../src/components/navigation-items.ts";

const root = process.cwd();
const allItems = [...primaryNavigationItems, ...secondaryNavigationItems];

function collectPageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectPageFiles(fullPath);
    return entry.isFile() && entry.name === "page.tsx" ? [fullPath] : [];
  });
}

test("all navigation destinations have unique keys and URLs", () => {
  assert.equal(new Set(allItems.map((item) => item.key)).size, allItems.length);
  assert.equal(new Set(allItems.map((item) => item.href)).size, allItems.length);
  assert.equal(allItems.length, 14);
});

test("every navigation destination resolves to an existing Next.js page", () => {
  for (const item of allItems) {
    const pagePath = resolve(root, "src/app", item.href.slice(1), "page.tsx");
    assert.ok(existsSync(pagePath), `Missing page for ${item.key}: ${pagePath}`);
  }
});

test("mobile navigation contains five unique primary destinations", () => {
  assert.equal(mobileNavigationItems.length, 5);
  assert.equal(new Set(mobileNavigationItems.map((item) => item.key)).size, 5);
  const primaryKeys = new Set(primaryNavigationItems.map((item) => item.key));
  for (const item of mobileNavigationItems) assert.ok(primaryKeys.has(item.key));
});

test("every page active key is represented in the shared navigation config", () => {
  const configuredKeys = new Set(allItems.map((item) => item.key));
  const pageFiles = collectPageFiles(resolve(root, "src/app/home"));
  const activeKeys = new Set();

  for (const pageFile of pageFiles) {
    const source = readFileSync(pageFile, "utf8");
    for (const match of source.matchAll(/<CommunityNavigation\s+active=["']([^"']+)["']/g)) {
      activeKeys.add(match[1]);
    }
  }

  assert.ok(activeKeys.size > 0, "No literal CommunityNavigation active keys were found");
  for (const key of activeKeys) assert.ok(configuredKeys.has(key), `Unconfigured active key: ${key}`);
});

test("desktop sidebar order keeps account controls before More destinations", () => {
  const source = readFileSync(resolve(root, "src/components/community-navigation.tsx"), "utf8");
  const primaryEnd = source.indexOf("</nav>");
  const accountControls = source.indexOf('className={styles.sidebarActions}');
  const moreDestinations = source.indexOf('className={styles.desktopMoreTrigger}');
  const footer = source.indexOf('className={styles.sidebarFoot}');

  assert.ok(primaryEnd >= 0 && accountControls > primaryEnd);
  assert.ok(moreDestinations > accountControls);
  assert.ok(footer > moreDestinations);
});

test("desktop rail surface styling does not recolour the phone bottom bar", () => {
  const styles = readFileSync(resolve(root, "src/components/community-navigation.module.css"), "utf8");
  const desktopRailStart = styles.indexOf("@media (min-width: 821px)");
  const mobileLayoutStart = styles.indexOf("@media (max-width: 820px)");
  assert.ok(desktopRailStart >= 0 && mobileLayoutStart > desktopRailStart);

  const desktopRailRules = styles.slice(desktopRailStart, mobileLayoutStart);
  assert.match(desktopRailRules, /\.sidebar\s*\{/);
  assert.match(desktopRailRules, /:global\(html\[data-theme="dark"\]\)\s+\.sidebar/);
  assert.match(desktopRailRules, /:global\(html\[data-theme="dark"\]\)\s+\.secondaryRail/);
  assert.match(desktopRailRules, /:global\\(html\\[data-theme="dark"\\]\\)\\s+\\.secondaryRail/);
});
