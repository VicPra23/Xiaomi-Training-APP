const CACHE_NAME = 'xiaomi-trainer-v47.10';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=47.10',
  './manifest.json',
  './src/main.js?v=47.10',
  './src/services/api.js?v=47.10',
  './src/views/Login.js?v=47.10',
  './src/views/Dashboard.js?v=47.10',
  './src/views/ReportForm.js?v=47.10',
  './src/views/Calendar.js?v=47.10',
  './src/views/Vacations.js?v=47.10',
  './src/views/Materials.js?v=47.10',
  './src/views/Messages.js?v=47.10',
  './Xiaomi_logo_(2021-).svg.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(APP_SHELL.map(asset =>
        fetch(asset, { cache: 'reload' })
          .then(response => {
            if (response.ok) return cache.put(asset, response);
            return null;
          })
          .catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('xiaomi-trainer-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        const fresh = fetch(request).then(response => {
          if (response.ok) {
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone())));
          }
          return response;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  const isCoreApplicationAsset = url.origin === self.location.origin &&
    ['script', 'style'].includes(request.destination);
  if (isCoreApplicationAsset) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
        return response;
      }))
    );
    return;
  }

  const isCacheableStatic = url.origin === self.location.origin ||
    ['script', 'style', 'font', 'image'].includes(request.destination);
  if (isCacheableStatic) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok || response.type === 'opaque') {
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
