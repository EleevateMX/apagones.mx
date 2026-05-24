// Apagones Mid — Service Worker v58 (forced cache refresh)
const CACHE = 'apagones-mid-v58';
const TILE_CACHE = 'apagones-tiles-v1';

const STATIC = [
  './', './index.html', './manifest.json',
  './icon.svg', './icon-maskable.svg', './favicon.ico',
  './icon-16.png', './icon-32.png', './icon-48.png',
  './icon-72.png', './icon-96.png', './icon-128.png',
  './icon-144.png', './icon-152.png', './icon-167.png',
  './icon-180.png', './icon-192.png', './icon-256.png',
  './icon-384.png', './icon-512.png', './icon-1024.png', './og-image.png',
  './icon-maskable-192.png', './icon-maskable-512.png',
  './data/distritos.kml',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// Pre-cache Mérida tiles zoom 10-12 (small area, manageable size)
const MERIDA_TILES = [];
for (let z = 10; z <= 12; z++) {
  const scale = Math.pow(2, z);
  const lat = 20.9674, lng = -89.6237;
  const x0 = Math.floor((lng + 180) / 360 * scale);
  const y0 = Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * scale);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const x = x0 + dx, y = y0 + dy;
      if (x >= 0 && y >= 0 && x < scale && y < scale) {
        MERIDA_TILES.push(`https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`);
      }
    }
  }
}

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})),
    caches.open(TILE_CACHE).then(c => c.addAll(MERIDA_TILES).catch(() => {}))
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== TILE_CACHE).map(k => {
        console.log('SW: deleting old cache', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
     .then(() => {
       // Force reload of all controlled windows
       return self.clients.matchAll({type:'window'}).then(clients => {
         clients.forEach(c => c.navigate(c.url));
       });
     })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase — network only
  if (url.hostname.includes('supabase.co') || url.hostname.includes('open-meteo.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Map tiles — cache first, then network, store in tile cache
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('openstreetmap.org')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(c =>
        c.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(resp => {
            if (resp.ok) c.put(e.request, resp.clone());
            return resp;
          }).catch(() => new Response('', {status:404}));
        })
      )
    );
    return;
  }

  // index.html and main HTML files: NETWORK FIRST so updates show immediately
  const isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' || url.pathname.endsWith('/');

  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Everything else — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || '⚡ Apagones MX', {
    body: data.body || 'Nueva incidencia en tu zona',
    icon: './icon-192.png', badge: './icon-192.png',
    tag: data.tag || 'apagones-mx', vibrate: [200,100,200],
    data: { url: './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || './'));
});


// Receive command from page to skip waiting and activate immediately
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
