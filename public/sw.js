const CACHE_NAME = 'stock-tracker-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// 安裝階段：預快取基本外殼
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache fallback warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 啟動階段：清除舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 請求攔截階段
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 僅處理 GET 請求
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 忽略 WebSocket / Chrome Extension
  if (url.protocol.startsWith('ws') || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 外部金融 API 請求採 Network-First
  const isExternalApi = url.origin !== self.location.origin && !url.hostname.includes('fonts.g');
  if (isExternalApi) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Network unavailable' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // 靜態資源 (HTML/JS/CSS/Fonts) 採 Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
