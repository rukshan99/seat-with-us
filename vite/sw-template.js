/* Service worker: keeps the seating finder working on weak or no signal.
 * Generated at build time: the version and asset list below are filled in by vite/plugins.js. */
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = `seat-with-us-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('seat-with-us-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});

/* Pages: try the network so an updated guest list arrives; fall back to the
 * saved copy if the signal is gone or too slow. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(new URL('./', self.registration.scope))) ||
      Response.error()
    );
  }
}

/* Scripts, styles, fonts: file names change when content changes, so a saved
 * copy is always correct. */
async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}
