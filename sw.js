/* ============================================================
   CineStream — Service Worker
   Handles Web Push Notifications & background fetch
   ============================================================ */

const SW_VERSION = 'v1.0.0';
const CACHE_NAME = `cinestream-${SW_VERSION}`;

// ── Install ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installed:', SW_VERSION);
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

// ── Push Event (Android notifications) ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'CineStream', body: event.data?.text() || 'New update!' };
  }

  const { title = 'CineStream', body = '', icon, badge, tag, type, url, image } = data;

  const iconMap = {
    movie:   '/icons/icon-movie.png',
    sports:  '/icons/icon-sports.png',
    series:  '/icons/icon-series.png',
    score:   '/icons/icon-score.png',
    default: '/icons/icon-192.png',
  };

  const options = {
    body,
    icon: icon || iconMap[type] || iconMap.default,
    badge: badge || '/icons/badge-72.png',
    tag: tag || `cinestream-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: url || '/', type },
    actions: type === 'score'
      ? [{ action: 'watch', title: '⚽ Watch Live' }, { action: 'dismiss', title: 'Dismiss' }]
      : [{ action: 'open', title: '▶ Watch Now' }, { action: 'dismiss', title: 'Later' }],
    image: image || null,
    requireInteraction: type === 'score', // live scores stay until dismissed
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url = '/', action } = event;
  const notifData = event.notification.data || {};

  if (action === 'dismiss') return;

  const targetUrl = notifData.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Message from main thread ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
