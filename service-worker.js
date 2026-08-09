/**
 * INFINITY AI — Service Worker
 * Minimal by design: caches the static app shell so the UI can install
 * as a PWA and open instantly, while all AI/chat/data requests always go
 * to the network (never cached) since answers must be fresh.
 */
const CACHE_NAME = 'infinity-ai-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/splash.js',
  '/js/starfield.js',
  '/js/voice.js',
  '/js/owner.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls — chat, weather, news, etc. must stay live.
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for the static app shell, falling back to network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') return caches.match('/index.html');
        })
      );
    })
  );
});
