/* Оффлайн-режим: чтобы приложение открывалось на площадке даже без связи.
   Поменяли содержимое сайта — поднимите номер версии ниже. */
const VERSION = "v2";
const CACHE = "umrelax-" + VERSION;

/* Самое нужное — кладём в кэш сразу при установке. */
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/img/hero.jpg",
  "./assets/img/map.jpg",
  "./assets/img/favicon.png",
  "./assets/img/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // не блокируем установку из-за одного файла
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // шрифты Google и прочее — мимо кэша

  /* Саму страницу берём из сети, чтобы правки были видны сразу.
     Нет сети — отдаём сохранённую копию. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  /* Картинки и прочие файлы: сначала кэш, потом сеть. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
