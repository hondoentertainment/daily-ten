/* Minimal offline shell — caches static shell; API calls stay network-first. */
const CACHE = "daily-tens-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const path of SHELL) {
        try {
          await cache.add(path);
        } catch {
          /* offline / preview may omit some paths */
        }
      }
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      )
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res.ok || res.type !== "basic") return res;
        const copy = res.clone();
        if (
          url.pathname === "/" ||
          url.pathname.endsWith(".html") ||
          url.pathname.endsWith(".css") ||
          url.pathname.endsWith(".js") ||
          url.pathname.endsWith(".webmanifest")
        ) {
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    }),
  );
});
