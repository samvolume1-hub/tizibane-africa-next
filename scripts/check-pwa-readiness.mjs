const origin = (process.env.TIZIBANE_ORIGIN || "https://tizibane-africa-next.onrender.com").replace(/\/$/, "");

async function get(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log(`Checking hosted TIZIBANE PWA at ${origin}`);
assert(origin.startsWith("https://"), "The app origin must use HTTPS.");

const manifestResponse = await get("/manifest.webmanifest");
const manifest = await manifestResponse.json();
assert(manifest.name === "TIZIBANE Zambia", "Unexpected app name in web manifest.");
assert(manifest.start_url === "/home", "The web manifest start_url must remain /home.");
assert(manifest.scope === "/", "The web manifest scope must remain /.");
assert(manifest.display === "standalone", "The web manifest must request standalone display.");
assert(Array.isArray(manifest.icons), "The web manifest has no icons array.");

for (const requiredSize of ["192x192", "512x512"]) {
  const icon = manifest.icons.find((item) => item.sizes?.split(/\s+/).includes(requiredSize));
  assert(icon?.src, `Missing required ${requiredSize} app icon.`);
  const iconResponse = await get(icon.src);
  const bytes = Buffer.from(await iconResponse.arrayBuffer());
  assert(bytes.length > 100, `The ${requiredSize} icon response is unexpectedly small.`);
  if (icon.type === "image/png" || icon.src.toLowerCase().endsWith(".png")) {
    assert(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `The ${requiredSize} icon is not a valid PNG.`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    assert(width >= Number.parseInt(requiredSize, 10) && height >= Number.parseInt(requiredSize, 10), `The ${requiredSize} icon dimensions are too small (${width}x${height}).`);
  }
  console.log(`✓ ${requiredSize} icon reachable: ${icon.src}`);
}

const workerResponse = await get("/sw.js");
const worker = await workerResponse.text();
assert(worker.includes('addEventListener("push"'), "The service worker is missing its push event handler.");
assert(worker.includes('addEventListener("notificationclick"'), "The service worker is missing its notification-click handler.");
console.log("✓ Push service worker and notification-click handler reachable.");

console.log("✓ Manifest, HTTPS origin, app icons and push service worker checks passed.");
