import { isValidObjectId } from 'mongoose'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 400, message: 'Neplatné ID vzpomínky.' })
  }

  const memory = await Memory.findByIdAndDelete(id).lean()
  if (!memory) {
    throw createError({ statusCode: 404, message: 'Vzpomínka nenalezena.' })
  }

  const filenames = (memory.photos || []).flatMap(photo => [photo.filename, photo.thumbnailFilename])
  if (filenames.length) {
    await deletePhotoFiles(filenames)
  }

  return { ok: true }
})
