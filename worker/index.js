/**
 * Custom Service Worker Source
 * Used by next-pwa with swSrc option. Compiled through webpack with Workbox.
 * Includes Workbox precaching, runtime caching for navigation, and push notification event handlers.
 */

import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { setDefaultHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

// Network-only for all navigation requests (avoids "no-response" errors on
// auth-protected dynamic pages like /admin/* that Workbox can't precache)
setDefaultHandler(new NetworkOnly());

// ============================================================
// Push Notification Event Handlers
// ============================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, data, icon, badge, timestamp } = payload;

    const options = {
      body: body || '',
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      data: data || {},
      timestamp: timestamp || Date.now(),
      vibrate: [200, 100, 200],
      tag: data?.booking_id || data?.type || 'default',
      renotify: true,
      requireInteraction: data?.type === 'booking_accepted',
      actions: data?.url
        ? [{ action: 'open', title: 'View' }]
        : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(title || 'SewaKhoj', options)
    );
  } catch (_e) {
    event.waitUntil(
      self.registration.showNotification('SewaKhoj', {
        body: event.data.text(),
        icon: '/logo.png',
        badge: '/logo.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'navigate', url: urlToOpen });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});