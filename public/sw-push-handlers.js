// Service Worker — Push Notification Handlers
// Appended to the Workbox-generated sw.js
// This file should be loaded as a separate script or inlined

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, data, icon, badge, timestamp } = payload;

    const options = {
      body: body || "",
      icon: icon || "/logo.png",
      badge: badge || "/logo.png",
      data: data || {},
      timestamp: timestamp || Date.now(),
      vibrate: [200, 100, 200],
      tag: data?.booking_id || data?.type || "default",
      renotify: true,
      requireInteraction: data?.type === "booking_accepted",
      actions: data?.url
        ? [{ action: "open", title: "View" }]
        : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    // Fallback for plain text notifications
    event.waitUntil(
      self.registration.showNotification("SewaKhoj", {
        body: event.data.text(),
        icon: "/logo.png",
        badge: "/logo.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "navigate", url: urlToOpen });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from the main thread (e.g., navigation requests)
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});