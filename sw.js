/* Puzzle King — Service Worker (GitHub Pages / PWA)
   Cache-first: app shell + ikon + font + audio Cloudinary.
   Bump VERSION on every update so clients fetch the new build. */
const VERSION = 'puzzle-king-v5';
const CACHE = 'pk-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

/* Audio eksternal ikut di-cache agar game tetap bersuara offline */
const RUNTIME_AUDIO = [
  'https://res.cloudinary.com/sogbouii/video/upload/v1788837529/Block_Drop_Bounce.mp3',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788837529/Block_Drop_Bounce_1.mp3',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788837789/WUT_WUT_WUT.wav',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788837869/Energy_Impulse_02.wav',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788965434/amazing-Pecah_2_baris_ke_atas.mp3',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788965435/congratulations-Level_success.mp3',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788965435/ow-penempatan_tida_pas.mp3',
  'https://res.cloudinary.com/sogbouii/video/upload/v1788965436/no-way-Pecah_1_baris.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // precache one by one — a single failure doesn't break the install
    await Promise.all(SHELL.map(async (u) => {
      try { await cache.add(new Request(u, { cache: 'reload' })); } catch (err) {}
    }));
    await Promise.all(RUNTIME_AUDIO.map(async (u) => {
      try { await cache.add(u); } catch (err) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Page navigation: network-first, fallback to cached index.html offline
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (err) {
        return cached || caches.match('./');
      }
    })());
    return;
  }

  // Cross-origin: only cache Cloudinary audio + Google Fonts
  const sameOrigin = url.origin === self.location.origin;
  const isCloudinary = /(^|\.)cloudinary\.com$/.test(url.hostname);
  const isFonts = /(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isCloudinary && !isFonts) return;

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreVary: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        const cache = await caches.open(CACHE);
        try { cache.put(req, fresh.clone()); } catch (err) {}
      }
      return fresh;
    } catch (err) {
      throw err;
    }
  })());
});
