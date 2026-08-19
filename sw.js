/* Dasturkhwan Service Worker v3 — offline-first */
const CACHE = 'dasturkhwan-v4';
const FILES = [
  '/', '/index.html', '/engine.js', '/dishes.json',
  '/manifest.json', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(FILES.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // dishes.json: network-first so updates land, cache as fallback
  if (url.pathname.endsWith('dishes.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(res => {
        const c = res.clone();
        caches.open(CACHE).then(x => x.put(e.request, c));
        return res;
      }).catch(() => caches.match('/index.html')))
  );
});
