
const CACHE_NAME = 'fidel-ai-v2'; // Bumped version for publish
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Use a Cache-First strategy for static assets, Network-First for API calls if needed
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Optional: Return a generic offline page if fetch fails
      });
    })
  );
});
