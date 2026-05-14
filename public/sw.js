// Minimal service worker to enable PWA install prompt
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  // In a robust PWA, you would implement caching strategies here
});
