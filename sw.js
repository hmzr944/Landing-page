/* Service worker d'Arbor : l'application fonctionne hors connexion.
   Fichiers de l'app : réseau d'abord (pour les mises à jour), cache en secours.
   Bibliothèques des CDN (polices Fontshare, icônes, pdf.js) : cache d'abord. */
const VERSION = 'arbor-v30';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/srs.js', './js/store.js', './js/db.js', './js/tutor.js', './js/markdown.js', './js/fx.js', './js/trophies.js', './js/pousse-dex.js', './js/lesson.js', './js/mastery.js', './js/insight.js', './js/explore.js', './js/dialogue.js', './js/onboarding.js', './js/pdf-import.js', './js/ai.js', './js/course.js', './js/storm.js', './js/local-ai.js',
  './js/mascot.js', './js/pwa.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png',
];
const CDN = ['api.fontshare.com', 'cdn.fontshare.com', 'unpkg.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com' || url.hostname === 'esm.sh' || url.hostname.endsWith('wikipedia.org')) return; // jamais en cache
  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
  }
});
