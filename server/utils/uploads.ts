import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import exifr from 'exifr'

/**
 * Formats accepted for upload. HEIC/HEIF is intentionally excluded since
 * sharp's HEIF support depends on how libvips was built and isn't reliable
 * across platforms - most phones can export/share as JPEG instead.
 */
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20 MB per uploaded file

const FULL_MAX_DIMENSION = 2000
const THUMBNAIL_MAX_DIMENSION = 400

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/

export interface UploadedPhotoMeta {
  filename: string
  thumbnailFilename: string
  originalName?: string
  mimeType: string
  size: number
  width?: number
  height?: number
  lat?: number
  lng?: number
}

export function isAllowedImageType(mimeType: string | undefined): mimeType is string {
  return !!mimeType && ALLOWED_IMAGE_TYPES.has(mimeType)
}

function getUploadsDir() {
  const config = useRuntimeConfig()
  return resolve(process.cwd(), config.uploadsDir || '.data/uploads')
}

async function ensureUploadsDir() {
  const dir = getUploadsDir()
  await mkdir(dir, { recursive: true })
  return dir
}

/**
 * Validates, resizes (strips EXIF/GPS metadata in the process) and persists
 * an uploaded photo to disk. Produces a "full" version (max ~2000px, used in
 * the detail gallery) and a "thumbnail" version (max ~400px, used in cards
 * and the calendar) so listing views stay fast.
 */
export async function saveUploadedPhoto(part: { filename?: string, type?: string, data: Buffer }): Promise<UploadedPhotoMeta> {
  if (!isAllowedImageType(part.type)) {
    throw createError({ statusCode: 400, message: 'Nepodporovaný formát fotky. Použij JPEG, PNG, WebP nebo GIF.' })
  }

  if (part.data.length > MAX_PHOTO_SIZE) {
    throw createError({ statusCode: 400, message: 'Fotka je příliš velká (max 20 MB).' })
  }

  let gpsData: { latitude: number, longitude: number } | undefined
  try {
    gpsData = await exifr.gps(part.data)
  } catch (error) {
    console.warn(`[uploads] GPS data nenalezena pro fotku ${part.filename}`)
  }

  const dir = await ensureUploadsDir()
  const id = randomUUID()

  const image = sharp(part.data, { failOn: 'none' }).rotate()

  const fullBuffer = await image
    .clone()
    .resize({ width: FULL_MAX_DIMENSION, height: FULL_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const thumbnailBuffer = await image
    .clone()
    .resize({ width: THUMBNAIL_MAX_DIMENSION, height: THUMBNAIL_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer()

  const { width, height } = await sharp(fullBuffer).metadata()

  const filename = `${id}.jpg`
  const thumbnailFilename = `${id}-thumb.jpg`

  await writeFile(join(dir, filename), fullBuffer)
  await writeFile(join(dir, thumbnailFilename), thumbnailBuffer)

  return {
    filename,
    thumbnailFilename,
    originalName: part.filename,
    mimeType: 'image/jpeg',
    size: fullBuffer.length,
    width,
    height,
    lat: gpsData?.latitude,
    lng: gpsData?.longitude
  }
}

export async function deletePhotoFiles(filenames: string[]) {
  const dir = await ensureUploadsDir()

  await Promise.all(
    filenames.map(async (filename) => {
      try {
        await unlink(join(dir, filename))
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
          console.error(`[uploads] Nepodařilo se smazat soubor ${filename}:`, error)
        }
      }
    })
  )
}

/**
 * Resolves a requested photo filename to an absolute path on disk, rejecting
 * anything that doesn't look like one of our own generated filenames. This
 * prevents path traversal since the filename always comes from user input
 * (the URL param).
 */
export function resolvePhotoPath(filename: string): string {
  if (!SAFE_FILENAME_REGEX.test(filename)) {
    throw createError({ statusCode: 400, message: 'Neplatný název souboru.' })
  }

  const dir = getUploadsDir()
  const filePath = join(dir, filename)

  if (!filePath.startsWith(dir)) {
    throw createError({ statusCode: 400, message: 'Neplatný název souboru.' })
  }

  return filePath
}
