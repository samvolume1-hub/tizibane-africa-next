const DEFAULT_URL = "/home/notifications";

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "You have a new community update." };
  }

  const title = typeof payload.title === "string" ? payload.title : "TIZIBANE";
  const body = typeof payload.body === "string" ? payload.body : "You have a new community update.";
  const tag = typeof payload.tag === "string" ? payload.tag : "tizibane-community-update";
  const target = typeof payload.url === "string" ? payload.url : DEFAULT_URL;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/images/tizibane-map-icon.svg",
      badge: "/images/tizibane-map-icon.svg",
      tag,
      renotify: false,
      data: { url: target },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = event.notification.data && event.notification.data.url;
  let target = new URL(DEFAULT_URL, self.location.origin);
  try {
    const candidate = new URL(typeof requested === "string" ? requested : DEFAULT_URL, self.location.origin);
    if (candidate.origin === self.location.origin) target = candidate;
  } catch {
    // Keep the safe in-app notifications destination.
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        if ("navigate" in client && client.url !== target.href) await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});

// TIZIBANE offline navigation fallback.
// Only this public, non-personal page is cached; authenticated pages, messages,
// profiles, feed data and API responses are deliberately never stored by this worker.
const OFFLINE_CACHE = "tizibane-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    try {
      await cache.add(OFFLINE_URL);
    } catch {
      // Keep installation resilient; the navigation handler has a safe text fallback.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("tizibane-offline-") && name !== OFFLINE_CACHE)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Network-first: do not cache the returned page or any authenticated content.
      return await fetch(request);
    } catch {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;

      return new Response(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>You're offline — TIZIBANE</title><body style=\"margin:0;padding:12vh 8vw;background:#160d20;color:#fff;font:16px system-ui;line-height:1.6\"><h1>You're offline.</h1><p>TIZIBANE needs an internet connection to load your community. Please reconnect and try again.</p></body></html>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
  })());
});
