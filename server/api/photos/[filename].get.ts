import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    throw createError({ statusCode: 400, message: 'Neplatný název souboru.' })
  }

  const filePath = resolvePhotoPath(filename)

  try {
    await stat(filePath)
  } catch {
    throw createError({ statusCode: 404, message: 'Fotka nenalezena.' })
  }

  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  setHeader(event, 'Content-Type', CONTENT_TYPES[extension] || 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')

  return sendStream(event, createReadStream(filePath))
})
