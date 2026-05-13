// Apagones MX — Service Worker
// Version: 2.0
const CACHE = 'apagones-mx-v2';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './data/distritos.kml',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// ── INSTALL: cache static assets ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for static, network-first for API ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first for Supabase API
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const opts = {
    body: data.body || '¡Hay un nuevo reporte en tu zona!',
    icon: './icon.svg',
    badge: './icon.svg',
    tag: data.tag || 'apagones-mx',
    data: { url: data.url || './' },
    actions: [
      { action: 'ver',    title: '👁️ Ver en mapa' },
      { action: 'ignore', title: 'Ignorar' }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false
  };
  e.waitUntil(self.registration.showNotification(data.title || '⚡ Apagones MX', opts));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'ver' || !e.action) {
    e.waitUntil(clients.openWindow(e.notification.data?.url || './'));
  }
});
