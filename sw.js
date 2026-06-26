const CACHE_NAME = 'cinestream-offline-v5';
// Only cache static JS/CSS assets, NOT html pages (pages must always be fresh)
const ASSETS_TO_CACHE = [
  '/css/detail.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/router.js',
  '/js/offlineStorage.js',
  '/js/tmdb.js',
  '/js/sports-api.js',
  '/js/download-manager.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          fetch(url).then(response => {
            if (!response.ok) throw new TypeError('Bad response status');
            return cache.put(url, response);
          }).catch(error => {
            console.warn('Failed to cache:', url, error);
          })
        )
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // ── Pass-through: Never intercept these external APIs / assets ──
  // Intercepting failed CORS requests causes "Failed to convert value to 'Response'" errors.
  const PASSTHROUGH_PATTERNS = [
    'espn.com',
    'api.espn.com',
    'placeholder.com',
    'placehold.co',
    'supabase.co',
    'tmdb.org',
    'themoviedb.org',
    'googleapis.com',
    'gstatic.com',
    'jsdelivr.net',
    'ui-avatars.com',
    'image.tmdb.org',
    'firebaseapp.com',
    'vidsrc.to',
    'embed.su',
  ];

  if (PASSTHROUGH_PATTERNS.some(pattern => url.includes(pattern))) {
    // Let the browser handle these natively — do NOT intercept
    return;
  }

  // For in-app API requests, always try network first, no caching
  if (url.includes('/api/') || url.includes('/tmdb-api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // HTML pages: ALWAYS fetch fresh from network — never serve from cache
  // This ensures UI changes show up immediately without needing to clear cache
  if (url.includes('.html') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For static assets (own domain), try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((networkResponse) => {
          // Only cache successful same-origin responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => {
        // If both cache and network fail, return offline index
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});
