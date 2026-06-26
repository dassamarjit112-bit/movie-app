const CACHE_NAME = 'cinestream-offline-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/detail.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/router.js',
  '/js/offlineStorage.js',
  '/pages/home.html',
  '/pages/home.js',
  '/pages/downloads.html',
  '/pages/downloads.js',
  '/pages/detail.html',
  '/pages/detail.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // We use addAll but wrap in a try-catch so one failed asset doesn't stop the whole cache
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
