const CACHE_NAME = 'smartupli-cache-v6';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './firebase-config.js',
    './smartupli_logo.png',
    './polikk_logo.png',
    './manifest.json'
];

// Install Event — Cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell and static assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event — Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event — Cache-first falling back to network strategy for static assets
self.addEventListener('fetch', event => {
    // Only handle HTTP/HTTPS requests (avoid chrome-extension://, firebase-storage, etc.)
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    // Fetch in background to update cache (stale-while-revalidate style)
                    fetch(event.request.clone())
                        .then(networkResponse => {
                            if (networkResponse.status === 200) {
                                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                            }
                        })
                        .catch(() => {/* Ignore network error when updating cache offline */});
                    return response;
                }
                return fetch(event.request);
            })
    );
});
