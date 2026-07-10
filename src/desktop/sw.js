// Service Worker SimpleMail — installable PWA, offline shell.
// Stratégie : network-first pour l'app shell, network-only pour l'API.
const CACHE = 'simplemail-v1';
const SCOPE_URL = new URL(self.registration.scope);
const APP_ROOT = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname : `${SCOPE_URL.pathname}/`;
const SHELL = [
  new URL('./', SCOPE_URL).toString(),
  new URL('./index.html', SCOPE_URL).toString(),
  new URL('./icon.png', SCOPE_URL).toString(),
  new URL('./manifest.webmanifest', SCOPE_URL).toString(),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Les ressources cross-origin (Google Fonts, Tailwind CDN, favicons externes)
  // doivent passer en réseau natif ; les intercepter ici déclenche la CSP
  // `connect-src 'self'` dans le contexte service worker.
  if (url.origin !== self.location.origin) return;
  // API : toujours réseau (jamais de cache pour les mails).
  if (url.pathname.startsWith(`${APP_ROOT}api/`)) return;
  // App shell : network-first, fallback cache (offline).
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match(new URL('./', SCOPE_URL).toString())))
  );
});
