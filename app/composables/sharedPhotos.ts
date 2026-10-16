export const SHARE_CACHE_NAME = 'share-target'
export const MAX_SHARED_PHOTOS = 20
const SHARED_MAX_AGE_MS = 24 * 60 * 60 * 1000
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_PHOTO_SIZE = 20 * 1024 * 1024

function hasCacheStorage() {
  return import.meta.client && typeof caches !== 'undefined'
}

/** Photos parked by the service worker after a share; entries that are stale or unusable are dropped. */
export async function readSharedPhotos() {
  if (!hasCacheStorage()) {
    return [] as File[]
  }

  const cache = await caches.open(SHARE_CACHE_NAME)
  const entries: Array<{ file: File, sharedAt: number }> = []

  for (const request of await cache.keys()) {
    const response = await cache.match(request)
    if (!response) {
      continue
    }

    const sharedAt = Number(response.headers.get('X-Shared-At')) || 0
    const blob = await response.blob()

    if (Date.now() - sharedAt > SHARED_MAX_AGE_MS || !ALLOWED_TYPES.has(blob.type) || blob.size > MAX_PHOTO_SIZE) {
      await cache.delete(request)
      continue
    }

    const name = decodeURIComponent(response.headers.get('X-Filename') || 'foto')
    const lastModified = Number(response.headers.get('X-Last-Modified')) || sharedAt
    entries.push({ file: new File([blob], name, { type: blob.type, lastModified }), sharedAt })
  }

  return entries
    .sort((left, right) => left.sharedAt - right.sharedAt)
    .map(entry => entry.file)
}

export async function clearSharedPhotos() {
  if (hasCacheStorage()) {
    await caches.delete(SHARE_CACHE_NAME)
  }
}
