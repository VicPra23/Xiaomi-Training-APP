const CACHE_NAME = 'xiaomi-trainer-v46.0';
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
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
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
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
