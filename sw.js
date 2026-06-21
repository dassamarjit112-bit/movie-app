/* ============================================================
   CineStream — Service Worker v2.0
   Handles Web Push + Background Periodic Sync for live scores
   ============================================================ */

const SW_VERSION = 'v2.0.0';
const CACHE_NAME = `cinestream-${SW_VERSION}`;
const ESPN_FIFA_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ── Install ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installed:', SW_VERSION);
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Register periodic sync for background score polling (every 15 min)
      self.registration.periodicSync?.register('live-scores-sync', { minInterval: 15 * 60 * 1000 }).catch(() => {}),
    ])
  );
});

// ── Background Periodic Sync (when app is CLOSED) ──
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'live-scores-sync') {
    event.waitUntil(_backgroundScoreFetch());
  }
});

async function _backgroundScoreFetch() {
  try {
    // Fetch live matches from ESPN directly in SW (no page needed)
    const endpoints = [
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', label: '🌍 FIFA World Cup 2026', icon: '🌍' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/cricket/8048/scoreboard',       label: '🏆 IPL',                icon: '🏏' },
      { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',       label: '⚽ Premier League',     icon: '⚽' },
    ];

    const cache = await caches.open('sw-score-cache');
    const prevRaw = await cache.match('prev-scores');
    const prevScores = prevRaw ? await prevRaw.json() : {};

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        const events = data.events || [];

        for (const evt of events) {
          const comp = evt.competitions?.[0];
          if (!comp) continue;
          const state = evt.status?.type?.state;
          if (state !== 'in') continue; // Only LIVE matches

          const home = comp.competitors?.find(c => c.homeAway === 'home') || comp.competitors?.[0];
          const away = comp.competitors?.find(c => c.homeAway === 'away') || comp.competitors?.[1];
          if (!home || !away) continue;

          const homeScore = home.score?.displayValue ?? home.score ?? '0';
          const awayScore = away.score?.displayValue ?? away.score ?? '0';
          const homeName = home.team?.displayName || home.athlete?.displayName || 'Home';
          const awayName = away.team?.displayName || away.athlete?.displayName || 'Away';
          const clock = evt.status?.displayClock || 'LIVE';
          const matchId = `sw-${evt.id}`;
          const scoreKey = `${homeScore}-${awayScore}`;
          const prevMatch = prevScores[matchId];

          if (!prevMatch) {
            // New live match — notify
            await self.registration.showNotification(`${ep.icon} LIVE: ${homeName} vs ${awayName}`, {
              body: `Score: ${homeScore} - ${awayScore} • ${clock} • ${ep.label}`,
              icon: '/favicon.png',
              badge: '/icons/badge-72.png',
              tag: `bg-live-${matchId}`,
              renotify: true,
              vibrate: [200, 100, 200],
              data: { url: '/#sports', type: 'score' },
              actions: [
                { action: 'watch', title: '⚽ Watch Live' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
              requireInteraction: true,
            });
          } else if (prevMatch.scoreKey !== scoreKey) {
            // Score changed — GOAL!
            await self.registration.showNotification(`${ep.icon} GOAL! ${homeName} ${homeScore} - ${awayScore} ${awayName}`, {
              body: `${clock} • ${ep.label} — Tap to watch the replay`,
              icon: '/favicon.png',
              badge: '/icons/badge-72.png',
              tag: `bg-goal-${matchId}`,
              renotify: true,
              vibrate: [300, 100, 300, 100, 300],
              data: { url: '/#sports', type: 'score' },
              actions: [
                { action: 'watch', title: '⚽ Watch Replay' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
              requireInteraction: true,
            });
          }

          prevScores[matchId] = { scoreKey };
        }
      } catch (e) { /* skip this endpoint on error */ }
    }

    // Persist updated scores
    await cache.put('prev-scores', new Response(JSON.stringify(prevScores)));
  } catch (e) {
    console.warn('[SW] Background score fetch failed:', e);
  }
}

// ── Push Event (server-sent push notifications) ──
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'CineStream', body: event.data?.text() || 'New update!' };
  }

  const { title = 'CineStream', body = '', icon, badge, tag, type, url, image } = data;

  const options = {
    body,
    icon: icon || '/favicon.png',
    badge: badge || '/icons/badge-72.png',
    tag: tag || `cinestream-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: url || '/#sports', type },
    actions: type === 'score'
      ? [{ action: 'watch', title: '⚽ Watch Live' }, { action: 'dismiss', title: 'Dismiss' }]
      : [{ action: 'open', title: '▶ Watch Now' }, { action: 'dismiss', title: 'Later' }],
    image: image || null,
    requireInteraction: type === 'score',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click — navigate to correct page ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const notifData = event.notification.data || {};

  if (action === 'dismiss') return;

  // Both 'watch', 'open', and direct tap go to the target URL
  const targetUrl = notifData.url || '/#sports';
  const absoluteUrl = targetUrl.startsWith('http') ? targetUrl : (self.location.origin + targetUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      // App is closed — open it to the target URL
      if (clients.openWindow) return clients.openWindow(absoluteUrl);
    })
  );
});

// ── Message from main thread ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
  if (event.data?.type === 'START_SCORE_POLL') {
    _backgroundScoreFetch();
  }
});
