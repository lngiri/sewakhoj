// Service Worker — Push Notification Handlers
// Appended to the Workbox-generated sw.js
// This file should be loaded as a separate script or inlined

/** Play a short attention beep using Web Audio API (Chrome 112+) */
function playNotificationBeep() {
  try {
    const ctx = new (self.AudioContext || (self).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    // Rising two-tone (like beepAccepted)
    o.frequency.setValueAtTime(659, ctx.currentTime); // E5
    o.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 700);
  } catch (_e) {
    // Web Audio not available in SW context — silently ignore
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, data, icon, badge, timestamp } = payload;

    // Play attention beep for all push notifications
    playNotificationBeep();

    const options = {
      body: body || "",
      icon: icon || "/logo.png",
      badge: badge || "/logo.png",
      data: data || {},
      timestamp: timestamp || Date.now(),
      sound: "/notification-sound.wav",
      vibrate: [300, 150, 300, 100, 300],
      tag: data?.booking_id || data?.type || "default",
      renotify: true,
      requireInteraction: true,
      actions: data?.url
        ? [{ action: "open", title: "View" }]
        : undefined,
      silent: false
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
        vibrate: [300, 150, 300],
        silent: false
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

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  const { type, title, body, tag, data, requireInteraction } = event.data || {};

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "SHOW_NOTIFICATION") {
    const notificationOptions = {
      body: body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: data || {},
      tag: tag || "default",
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: requireInteraction === true,
      actions: data?.url
        ? [{ action: "open", title: "View" }]
        : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(title || "SewaKhoj", notificationOptions)
    );
  }
});
