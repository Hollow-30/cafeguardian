/* Café Guardián — no interceptar navegación ni payloads RSC de Next.js. */
const CACHE_NAME = "cafe-guardian-v2"
const APP_SHELL = ["/", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)
  // Dejar pasar navegaciones y datos de App Router (si no, el header "no lleva" a donde debe).
  if (event.request.mode === "navigate") return
  if (url.pathname.startsWith("/_next")) return
  if (url.searchParams.has("_rsc")) return
  if (url.pathname.startsWith("/api/")) return

  // Solo assets estáticos del mismo origen.
  if (url.origin !== self.location.origin) return
  if (!/\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname) && url.pathname !== "/icon.svg") {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response.ok) return response
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
    }),
  )
})
