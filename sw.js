/* Service worker mínimo: guarda los archivos de la revista para que
   abra rápido y funcione sin internet una vez visitada.
   Sube el número de CACHE cada vez que publiques cambios. */

const CACHE = 'revista-v2';

const ARCHIVOS = [
  './',
  './index.html',
  './css/magazine.css',
  './js/app.js',
  './js/data.js',
  './js/flipbook.js',
  './js/editorial.js',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icono-192.svg',
  './assets/icono-512.svg'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  if (new URL(pedido.url).origin !== location.origin) return;   // fuentes de Google van directo

  // Red primero y caché de respaldo: así ves los cambios al publicar.
  evento.respondWith(
    fetch(pedido)
      .then(respuesta => {
        const copia = respuesta.clone();
        caches.open(CACHE).then(cache => cache.put(pedido, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() => caches.match(pedido).then(r => r || caches.match('./index.html')))
  );
});
