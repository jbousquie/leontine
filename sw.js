// Service worker for Leontine PWA
const CACHE_NAME = "leontine-cache-v3";
const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./js/conf.js",
    "./js/main.js",
    "./js/ui.js",
    "./js/api.js",
    "./manifest.json",
];

// Install event - cache assets
self.addEventListener("install", (event) => {
    console.log("Service Worker installing");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Cache opened");
            return cache.addAll(urlsToCache);
        }),
    );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
    console.log("Service Worker activating");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("Removing old cache:", cacheName);
                        return caches.delete(cacheName);
                    }
                }),
            );
        }),
    );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return the cached response if found
            if (response) {
                return response;
            }

            // Otherwise, fetch from network
            return fetch(event.request)
                .then((response) => {
                    // Don't cache API calls or non-successful responses
                    if (
                        (!event.request.url.includes("/api") && !response) ||
                        response.status !== 200 ||
                        response.type !== "basic"
                    ) {
                        return response;
                    }

                    // Clone the response as it's a stream and can only be consumed once
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch((error) => {
                    console.log("Fetch failed:", error);
                });
        }),
    );
});
