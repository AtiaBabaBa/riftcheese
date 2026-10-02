// Service worker: lets the installed app open offline.
// Pages and the card list: network first, so updates show up as soon as they're pushed; the cached copy is the offline fallback.
// Card images, icons and fonts: served from the cache and refreshed in the background.
// Everything else (cloud saving, ads) goes straight to the network.
const CACHE = 'riftcheese-v1';
const CORE = ['./', 'index.html', 'privacy.html', 'cards/cards.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('riftcheese-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

async function networkFirst(req) {
  try { return save(req, await fetch(req)); }
  catch (err) {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') { const home = await caches.match('./'); if (home) return home; }
    throw err;
  }
}

async function staleWhileRevalidate(e) {
  const hit = await caches.match(e.request);
  const fresh = fetch(e.request).then(res => save(e.request, res));
  if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
  return fresh;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('/');
    e.respondWith(isPage ? networkFirst(req) : staleWhileRevalidate(e));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(e));
  }
});
