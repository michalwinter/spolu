// Loaded into the generated service worker via workbox.importScripts (see nuxt.config.ts).
// Receives photos shared from other apps (Web Share Target) and parks them in Cache Storage
// until the page picks them up. Nothing is sent to the server here.
const SHARE_CACHE_NAME = 'share-target'
const SHARE_PATH = '/share-target'
const SHARE_FIELD = 'photos'

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'POST' || new URL(request.url).pathname !== SHARE_PATH) {
    return
  }

  event.respondWith((async () => {
    try {
      const formData = await request.formData()
      const files = formData.getAll(SHARE_FIELD).filter(value => typeof value !== 'string')
      const cache = await caches.open(SHARE_CACHE_NAME)
      const batch = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      await Promise.all(files.map((file, index) => cache.put(
        `${SHARE_PATH}/files/${batch}-${index}`,
        new Response(file, {
          headers: {
            'Content-Type': file.type,
            'X-Filename': encodeURIComponent(file.name),
            'X-Last-Modified': String(file.lastModified),
            'X-Shared-At': String(Date.now())
          }
        })
      )))
    } catch (error) {
      console.error('[share-target] Sdílené fotky se nepodařilo uložit', error)
    }

    return Response.redirect('/', 303)
  })())
})
