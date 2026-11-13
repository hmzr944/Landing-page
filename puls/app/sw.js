/* Service worker de PULS App.
   Règle : seuls les fichiers statiques de l'interface sont mis en cache (HTML, CSS, JS, icônes, polices).
   Les données (dossiers, clients, preuves) ne passent jamais par ce cache : toute requête vers une API,
   toute requête non GET et toute requête vers un autre domaine que ceux listés est ignorée. */
const VERSION = "puls-app-v2";
const SHELL = ["./", "./index.html", "./puls.css", "./puls.js", "./effects.js", "./shell.js", "./demo-data.js", "./demo-policies.js", "./dist/config/index.js", "./dist/config/view.js", "./dist/config/store.js", "./dist/config/errors.js", "./dist/config/validate.js", "./dist/config/types.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const STATIC_CDN = ["fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com", "cdn.jsdelivr.net"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("puls-app-") && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.includes("/api/") || url.hostname.endsWith(".supabase.co")) return; // données : jamais en cache

  if (STATIC_CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin === location.origin && url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) {
    // réseau d'abord pour recevoir les mises à jour, cache en secours hors connexion
    e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => {
      if (res.ok && /\.(html|css|js|png|webmanifest|woff2)$|\/$/.test(url.pathname)) {
        const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))));
  }
});
