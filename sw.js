const CACHE_NAME = 'cinestream-offline-v3';
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

  // For API requests, always try network first, then cache
  if (event.request.url.includes('/tmdb-api/') || event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return from cache
        }
        return fetch(event.request).then((networkResponse) => {
          // Don't cache dynamic pages or external ad scripts
          if (!event.request.url.startsWith('http') || event.request.url.includes('formssternlystately.com')) {
            return networkResponse;
          }
          
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => {
        // If both cache and network fail, maybe return offline page
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
