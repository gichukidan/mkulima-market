/* Mkulima Market service worker.
   The server fills in {{ASSET_V}} and the precache list, so every deploy gets a fresh cache.
   - App shell and versioned assets: cache first (fast repeat loads, works offline).
   - Page navigations: network first, fall back to the cached shell when offline.
   - Fonts and the Leaflet library: stale-while-revalidate.
   - /api/*: always network (data must be fresh, never cached by the worker). */
var VERSION = "{{ASSET_V}}";
var SHELL_CACHE = "mkulima-shell-" + VERSION;
var RUNTIME_CACHE = "mkulima-runtime-v1";
var PRECACHE = "{{PRECACHE}}";
var RUNTIME_MAX = 60;

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) { return cache.addAll(PRECACHE); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf("mkulima-shell-") === 0 && k !== SHELL_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// The page asks the new worker to take over after the user clicks "Reload".
self.addEventListener("message", function (event) {
  if (event.data === "skipWaiting") self.skipWaiting();
});

function trim(cacheName, max) {
  caches.open(cacheName).then(function (cache) {
    cache.keys().then(function (keys) {
      if (keys.length > max) cache.delete(keys[0]).then(function () { trim(cacheName, max); });
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Never cache API calls or the admin page.
  if (url.origin === location.origin && (url.pathname.indexOf("/api/") === 0 || url.pathname.indexOf("/admin") === 0)) return;

  // Page loads: try the network, fall back to the cached app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (c) { c.put("/", copy); });
        return res;
      }).catch(function () {
        return caches.match("/", { cacheName: SHELL_CACHE }).then(function (r) {
          return r || new Response("<h1>Offline</h1><p>Connect to the internet and try again.</p>", { headers: { "Content-Type": "text/html" } });
        });
      })
    );
    return;
  }

  // Our own static files: cache first.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, copy); trim(RUNTIME_CACHE, RUNTIME_MAX); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Google Fonts and unpkg (Leaflet): serve cached copy, refresh in the background.
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)$/.test(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var network = fetch(req).then(function (res) {
            if (res.ok || res.type === "opaque") { cache.put(req, res.clone()); trim(RUNTIME_CACHE, RUNTIME_MAX); }
            return res;
          }).catch(function () { return hit; });
          return hit || network;
        });
      })
    );
  }
});
