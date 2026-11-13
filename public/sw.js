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
