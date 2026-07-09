// Self-destroying Service Worker
// Clears all caches and unregisters itself to resolve caching issues

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    console.log('[Service Worker] Deleting cache:', cache);
                    return caches.delete(cache);
                })
            );
        })
        .then(() => {
            console.log('[Service Worker] Unregistering self...');
            return self.registration.unregister();
        })
        .then(() => self.clients.claim())
        .then(() => {
            // Force reload all open client windows
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    if (client.url) {
                        console.log('[Service Worker] Force reloading client:', client.url);
                        client.navigate(client.url);
                    }
                });
            });
        })
    );
});
