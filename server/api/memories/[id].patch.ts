import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

const fieldsSchema = z.object({
  date: z.iso.datetime(),
  time: z.string().trim().max(5).optional(),
  text: z.string().trim().min(1).max(5000),
  location: z.string().trim().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  removePhotoIds: z.string().optional()
})

const MAX_PHOTOS_PER_MEMORY = 20

interface PhotoSubdoc {
  _id: { toString(): string }
  filename: string
  thumbnailFilename: string
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 400, message: 'Neplatné ID vzpomínky.' })
  }

  let fileParts: Array<{ filename?: string, type?: string, data: Buffer }> = []

  try {
    const memory = await Memory.findById(id)
    if (!memory) {
      throw createError({ statusCode: 404, message: 'Vzpomínka nenalezena.' })
    }

    const parts = await readMultipartFormData(event)
    if (!parts) {
      throw createError({ statusCode: 400, message: 'Chybí data formuláře.' })
    }

    const fields: Record<string, string> = {}
    fileParts = []

    for (const part of parts) {
      if (part.filename) {
        fileParts.push(part)
      } else if (part.name) {
        fields[part.name] = part.data.toString('utf-8')
      }
    }

    const parsedFields = fieldsSchema.safeParse(fields)
    if (!parsedFields.success) {
      throw createError({ statusCode: 400, message: 'Vyplň prosím datum a text vzpomínky.' })
    }

    if (fileParts.length > MAX_PHOTOS_PER_MEMORY) {
      throw createError({ statusCode: 400, message: `Najednou lze nahrát maximálně ${MAX_PHOTOS_PER_MEMORY} fotek.` })
    }

    let removeIds: string[] = []
    if (parsedFields.data.removePhotoIds) {
      try {
        const decoded = JSON.parse(parsedFields.data.removePhotoIds)
        if (Array.isArray(decoded)) {
          removeIds = decoded.filter((value): value is string => typeof value === 'string')
        }
      } catch {
        throw createError({ statusCode: 400, message: 'Neplatný seznam fotek ke smazání.' })
      }
    }

    const existingPhotos = memory.photos as unknown as PhotoSubdoc[]
    const photosToRemove = existingPhotos.filter(photo => removeIds.includes(photo._id.toString()))
    const remainingPhotos = existingPhotos.filter(photo => !removeIds.includes(photo._id.toString()))

    const newPhotos = []
    for (const part of fileParts) {
      newPhotos.push(await saveUploadedPhoto(part))
    }

    memory.set({
      date: new Date(parsedFields.data.date),
      text: parsedFields.data.text,
      location: parsedFields.data.location || undefined,
      lat: parsedFields.data.lat,
      lng: parsedFields.data.lng,
      photos: [...remainingPhotos, ...newPhotos]
    })
    await memory.save()

    if (photosToRemove.length) {
      await deletePhotoFiles(photosToRemove.flatMap(photo => [photo.filename, photo.thumbnailFilename]))
    }

    const populated = await Memory.findById(memory._id).populate('authorId', 'name username').lean()

    return serializeMemory(populated!)
  } catch (error: any) {
    console.error('[memories:update] Nepodařilo se uložit vzpomínku', {
      memoryId: id,
      files: fileParts.map(file => ({
        filename: file.filename,
        type: file.type,
        size: file.data.length
      }))
    }, error)

    if (typeof error?.statusCode === 'number') {
      throw error
    }

    throw createError({ statusCode: 500, message: 'Nepodařilo se uložit vzpomínku.' })
  }
})
