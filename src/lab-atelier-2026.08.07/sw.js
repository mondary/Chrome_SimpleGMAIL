const CACHE = 'pkmail-lab-snapshot-atelier-2026.08.07';
const CACHE_PREFIX = 'pkmail-lab-snapshot-atelier-';
const SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'fonts/JetBrainsMonoNerdFont-Regular.ttf', 'fonts/JetBrainsMonoNerdFont-SemiBold.ttf'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
