import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");

function readText(path) {
  const fullPath = resolve(root, path);
  assert.ok(existsSync(fullPath), `Required file is missing: ${path}`);
  return readFileSync(fullPath, "utf8");
}

function pngDimensions(path) {
  const fullPath = resolve(publicDir, path.replace(/^\//, ""));
  assert.ok(existsSync(fullPath), `Required PNG icon is missing: public/${path}`);
  const data = readFileSync(fullPath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(data.length >= 24 && data.subarray(0, 8).equals(signature), `Not a valid PNG: public/${path}`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

const manifest = JSON.parse(readText("public/manifest.webmanifest"));
assert.equal(manifest.name, "TIZIBANE Zambia", "Manifest name must match approved public branding.");
assert.equal(manifest.short_name, "TIZIBANE");
assert.equal(manifest.start_url, "/home");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone", "Install experience must launch in standalone display mode.");

const icon192 = manifest.icons?.find((icon) => icon.sizes === "192x192" && icon.type === "image/png" && icon.purpose === "any");
const icon512 = manifest.icons?.find((icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any");
const maskable512 = manifest.icons?.find((icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable");
assert.ok(icon192, "Manifest must declare a 192x192 PNG app icon.");
assert.ok(icon512, "Manifest must declare a 512x512 PNG app icon.");
assert.ok(maskable512, "Manifest must declare a 512x512 maskable PNG icon.");
assert.deepEqual(pngDimensions(icon192.src), { width: 192, height: 192 }, "192px icon dimensions must match its manifest declaration.");
assert.deepEqual(pngDimensions(icon512.src), { width: 512, height: 512 }, "512px icon dimensions must match its manifest declaration.");
assert.deepEqual(pngDimensions(maskable512.src), { width: 512, height: 512 }, "Maskable icon dimensions must match its manifest declaration.");

const appleIcon = pngDimensions("/icons/apple-touch-icon.png");
assert.deepEqual(appleIcon, { width: 180, height: 180 }, "Apple touch icon must be 180x180.");

const layout = readText("src/app/layout.tsx");
assert.ok(layout.includes("TIZIBANE Zambia"), "Page metadata must use the approved Zambia brand.");
assert.ok(!layout.includes("TIZIBANE Africa"), "Old TIZIBANE Africa page metadata must not remain.");
assert.ok(layout.includes("/icons/apple-touch-icon.png"), "Apple touch icon must be linked by page metadata.");
assert.ok(layout.includes("PwaServiceWorkerRegistration"), "The service worker must be registered for all supported visitors.");
assert.ok(layout.includes("PwaInstallPrompt"), "The browser install prompt must be available at the app root.");

const offlinePage = readText("public/offline.html");
assert.ok(offlinePage.includes("You're offline"), "A clear offline explanation must be present.");
assert.ok(offlinePage.includes("not saved as offline copies"), "Offline fallback must explain the privacy boundary.");

const worker = readText("public/sw.js");
assert.match(worker, /addEventListener\(["']push["']/);
assert.match(worker, /addEventListener\(["']notificationclick["']/);
assert.match(worker, /addEventListener\(["']fetch["']/);
assert.ok(worker.includes("OFFLINE_CACHE") && worker.includes("OFFLINE_URL"), "Offline cache constants must be declared.");
assert.ok(worker.includes("cache.add(OFFLINE_URL)"), "Only the static offline fallback should be pre-cached.");
assert.ok(worker.includes('request.mode !== "navigate"'), "Offline interception must be restricted to navigations.");
assert.ok(worker.includes("return await fetch(request)"), "Navigation must be network-first.");
assert.ok(!/cache\.(?:add|put)\(\s*request/.test(worker), "Navigation requests must never be written to cache.");

console.log("TIZIBANE PWA checks passed: manifest, PNG dimensions, Apple icon, branding, install components, and privacy-safe offline fallback.");
