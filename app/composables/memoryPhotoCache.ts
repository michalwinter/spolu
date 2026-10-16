import type { SerializedDailyReport } from '~~/server/utils/serialize'

// Same cache name as the service worker route for /api/photos/*, so both write to one place.
export const PHOTO_CACHE_NAME = 'api-photos'
const PHOTO_URL_PREFIX = '/api/photos/'

function hasCacheStorage() {
  return import.meta.client && typeof caches !== 'undefined'
}

export function collectPhotoFilenames(reports: SerializedDailyReport[]) {
  const thumbnails = new Set<string>()
  const originals = new Set<string>()

  for (const report of reports) {
    for (const memory of report.memories) {
      for (const photo of memory.photos) {
        thumbnails.add(photo.thumbnailFilename)
        originals.add(photo.filename)
      }
    }
  }

  return { thumbnails: [...thumbnails], originals: [...originals] }
}

/** Downloads photos that are not stored yet so they can be shown without a connection. */
export async function cachePhotos(filenames: string[], concurrency = 4) {
  if (!hasCacheStorage() || !filenames.length) {
    return
  }

  const cache = await caches.open(PHOTO_CACHE_NAME)
  const queue = [...new Set(filenames)]

  async function worker() {
    while (queue.length && navigator.onLine) {
      const url = `${PHOTO_URL_PREFIX}${queue.shift()}`

      try {
        if (await cache.match(url)) {
          continue
        }

        const response = await fetch(url, { credentials: 'same-origin' })
        if (response.ok) {
          await cache.put(url, response)
        }
      } catch {
        // Connection dropped; the next sync fills in what is missing.
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
}

/** Drops cached photos that no longer belong to any memory. */
export async function prunePhotoCache(keepFilenames: Set<string>) {
  if (!hasCacheStorage()) {
    return
  }

  const cache = await caches.open(PHOTO_CACHE_NAME)

  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith(PHOTO_URL_PREFIX) && !keepFilenames.has(pathname.slice(PHOTO_URL_PREFIX.length))) {
      await cache.delete(request)
    }
  }
}

export async function clearPhotoCaches() {
  if (!hasCacheStorage()) {
    return
  }

  await Promise.allSettled([PHOTO_CACHE_NAME, 'app-pages', 'api-memories', 'api-memories-summary', 'api-gallery', 'share-target']
    .map(name => caches.delete(name)))
}
