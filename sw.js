const CACHE_NAME = 'xiaomi-trainer-v46.7';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './src/main.js',
  './src/services/api.js',
  './src/views/Login.js',
  './src/views/Dashboard.js',
  './src/views/ReportForm.js',
  './src/views/Calendar.js',
  './src/views/Vacations.js',
  './src/views/Materials.js',
  './src/views/Messages.js',
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
