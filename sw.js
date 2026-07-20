// ==========================================================================
// MY INTERNMS — SERVICE WORKER (Cache-First Strategy)
// Strategi: Papar dari cache serta-merta, kemaskini cache di latar belakang.
// Ini membolehkan app buka SERTA-MERTA walaupun tiada atau lambat internet.
// ==========================================================================

const CACHE_NAME    = 'upli-static-v9';
const CACHE_VERSION = 9; // Tingkatkan nombor ini jika ada perubahan fail utama

// Senarai fail statik yang akan dicache semasa pemasangan
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.v4.js',
    './firebase-config.js',
    './manifest.json',
    './smartupli_logo.png',
    './polikk_logo.png',
    './icon-192.png',
    './icon-512.png'
];

// ── INSTALL: Cache semua fail statik ──────────────────────────────────────
self.addEventListener('install', event => {
    console.log('[SW] Memasang service worker dan mencache fail statik...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => {
                console.log('[SW] ✅ Semua fail statik berjaya dicache.');
                return self.skipWaiting(); // Aktifkan SW baru serta-merta
            })
            .catch(err => console.warn('[SW] Cache addAll gagal (sebahagian fail mungkin tidak wujud):', err))
    );
});

// ── ACTIVATE: Buang cache lama jika ada ──────────────────────────────────
self.addEventListener('activate', event => {
    console.log('[SW] Mengaktifkan service worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME) // Buang cache versi lama sahaja
                    .map(name => {
                        console.log('[SW] Memadamkan cache lama:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] ✅ Service worker aktif. Cache bersih.');
            return self.clients.claim(); // Ambil kawalan semua tab serta-merta
        })
    );
});

// ── FETCH: Cache-First + Network Fallback ────────────────────────────────
// Fail statik: hidang dari cache (serta-merta), kemaskini cache di latar
// Request lain (API/Google Sheets): terus ke network, jangan cache
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Jangan intercept request API luaran (Google Sheets, Firebase, CDN fonts)
    const isExternal = !url.origin.includes(self.location.origin) &&
                       !url.pathname.match(/\.(html|css|js|png|jpg|webp|json|svg|ico)$/);
    if (isExternal) return; // Biarkan browser uruskan terus

    // Jangan cache POST requests (Google Apps Script calls)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Fetch dari network untuk kemaskini cache di latar (Stale-While-Revalidate)
            const networkFetch = fetch(event.request)
                .then(networkResponse => {
                    // Hanya cache response yang berjaya (status 200)
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Network gagal — tidak mengapa, cache ada
                    console.log('[SW] Network gagal. Guna cache.');
                });

            // Pulangkan cache serta-merta (jika ada), network berjalan di latar
            return cachedResponse || networkFetch;
        })
    );
});
