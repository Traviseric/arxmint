// ArxMint Service Worker — v1
// Provides offline fallback for the merchant dashboard.

const CACHE_NAME = 'arxmint-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, '/']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Remove old caches when a new service worker activates
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle navigation requests for offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
