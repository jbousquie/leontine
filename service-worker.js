// Leontine PWA Service Worker
const CACHE_NAME = 'leontine-transcription-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/storage.js',
  '/js/ui.js',
  '/js/app.js',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker installing cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip for API requests - never cache those
  if (event.request.url.includes('/transcribe') || 
      event.request.url.includes('/transcription/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request - request streams can only be used once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check for valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response - response streams can only be used once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache GET requests
              if (event.request.method === 'GET') {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        }).catch(() => {
          // Network failed - could return a custom offline page here
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html');
          // }
          return new Response('Network error occurred. Please check your connection.');
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'transcription-sync') {
    event.waitUntil(syncTranscriptionData());
  }
});

// Utility function to sync data when back online
async function syncTranscriptionData() {
  // Implementation would depend on what data needs to be synced
  // This could retrieve cached requests from IndexedDB and retry them
  console.log('Background sync triggered');
}