/* ============================================================
   DASTURKHWAN SERVICE WORKER  v5
   Proper offline support — required for the Android app.

   Strategy:
     - HTML/JS/JSON : network first, cache as fallback
                      (so updates always land, offline still works)
     - icons/images : cache first (they never change)
     - bump CACHE_VERSION on every release to clear old files
   ============================================================ */

const CACHE_VERSION = 'dk-v5';
const CORE = [
  '/', '/index.html', '/engine.js', '/dishes.json', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (c) { return Promise.allSettled(CORE.map(function (f) { return c.add(f); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
                               .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // let fonts/CDN go direct

  const isImage = /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);

  if (isImage) {
    /* cache first — icons never change within a version */
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
          return res;
        });
      })
    );
    return;
  }

  /* network first for everything else, so a deploy always shows up */
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('/index.html');
        });
      })
  );
});
