const CACHE_NAME = "welding-guide-122-v17";
const CACHE_PREFIX = "welding-guide-122-";
const APP_ROOT = new URL("./", self.location.href);
const CORE_ASSETS = [
  "./css/pwa-update.css?v=1",
  "./js/pwa-update.js?v=1",
  "./css/mobile-header.css?v=2",
  "./js/system-time.js?v=1",
  "./",
  "./index.html",
  "./css/home-link.css?v=5",
  "./css/style.css",
  "./css/style.css?v=14",
  "./js/app.js",
  "./js/app.js?v=15",
  "./js/update-state.js?v=2",
  "./data/manual.json",
  "./manifest.json",
  "./assets/images/procedures/threading-1.webp",
  "./assets/images/procedures/threading-2.webp",
  "./assets/images/procedures/threading-3.webp",
  "./assets/images/procedures/threading-4.webp",
  "./assets/images/procedures/gap-1.webp",
  "./assets/images/procedures/gap-2.webp",
  "./assets/images/procedures/gap-3.webp",
  "./assets/images/procedures/gap-4.webp",
  "./assets/images/procedures/gap-5.webp",
  "./assets/images/procedures/gap-6.webp",
  "./assets/images/procedures/home-1.webp",

  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
].map(function (path) { return new URL(path, APP_ROOT).toString(); });

function isCacheable(response) {
  return response && response.ok && response.type !== "opaque";
}

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(CORE_ASSETS); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (name) {
        return name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME;
      }).map(function (name) { return caches.delete(name); }));
    })
  ]));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await (await caches.open(CACHE_NAME)).match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return (await caches.open(CACHE_NAME)).match(new URL("./index.html", APP_ROOT).toString());
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await (await caches.open(CACHE_NAME)).match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  if (request.mode === "navigate" || ["document", "script", "style", "manifest"].includes(request.destination) || url.pathname.endsWith("/data/manual.json")) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (["image", "font", "video", "audio"].includes(request.destination)) event.respondWith(cacheFirst(request));
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
