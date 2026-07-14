// No-op service worker.
// Keeps stale browser/PWA registrations from requesting a missing /sw.js file.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
