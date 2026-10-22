const CACHE_NAME = 'xiaomi-trainer-v52.0';


const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './src/main.js',
  './src/services/api.js',
  './src/services/photo-worker.js',
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

  // Omitir peticiones externas a Google, Drive, CDNs y APIs para que nunca se intercepten ni se cacheen de forma cruzada
  if (
    url.hostname.endsWith('google.com') ||
    url.hostname.endsWith('googleusercontent.com') ||
    url.hostname.endsWith('gstatic.com') ||
    url.hostname.endsWith('jsdelivr.net') ||
    url.hostname.endsWith('unpkg.com')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    const fresh = fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('./index.html', response.clone());
      }
      return response;
    });
    event.waitUntil(fresh.catch(() => null));
    event.respondWith(fresh.catch(() => caches.match('./index.html')));
    return;
  }

  // Solo cachear estáticos del propio origen de la aplicación
  const isCacheableStatic = url.origin === self.location.origin;
  if (isCacheableStatic) {
    const result = caches.open(CACHE_NAME).then(cache =>
      cache.match(request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        return fetch(request).then(async response => {
          if (response.ok || response.type === 'opaque') {
            await cache.put(request, response.clone());
          }
          return response;
        });
      })
    );
    event.waitUntil(result.then(() => null, () => null));
    event.respondWith(result);
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'SHOW_DAILY_NOTIFICATION') {
    const payload = event.data;
    event.waitUntil(
      self.registration.showNotification(payload.title || 'Xiaomi Trainer', {
        body: payload.body || '',
        icon: './Xiaomi_logo_(2021-).svg.png',
        badge: './Xiaomi_logo_(2021-).svg.png',
        tag: payload.tag || 'xiaomi-daily',
        data: { url: payload.url || './#calendar' }
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './#calendar';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url && !client.url.includes('#calendar')) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

