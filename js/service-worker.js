const CACHE_NAME = 'goldbox-rpg-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './js/level.js',
  './js/game.js',
  './js/minimap.js',
  './js/controls.js',
  './js/threejs-renderer.js',
  './js/firstperson.js',
  './assets/sprites/enemy.png',
  './assets/sprites/enemy2.png',
  './assets/sprites/npc.png',
  './assets/sprites/npc2.png',
  './assets/sprites/tree.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Активация
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
          return response;
        });
      })
  );
});