import { z } from 'zod'
import { LeanDailyReport } from '~~/server/utils/serialize'

const fieldsSchema = z.object({
  date: z.iso.datetime(),
  time: z.string().trim().optional(),
  text: z.string().trim().min(1).max(5000),
  location: z.string().trim().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  tags: z.string().optional()
})

const MAX_PHOTOS_PER_MEMORY = 20

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  let fileParts: Array<{ filename?: string, type?: string, data: Buffer }> = []

  try {
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

    let tags: string[] = []
    if (parsedFields.data.tags) {
      try {
        const parsedTags = JSON.parse(parsedFields.data.tags)
        if (Array.isArray(parsedTags)) {
          tags = parsedTags
            .filter((value): value is string => typeof value === 'string')
            .map(tag => tag.trim())
            .filter(Boolean)
        }
      } catch {
        throw createError({ statusCode: 400, message: 'Neplatný seznam štítků.' })
      }
    }

    const photos = []
    for (const part of fileParts) {
      photos.push(await saveUploadedPhoto(part))
    }

    const photoWithGps = photos.find(p => p.lat !== undefined && p.lng !== undefined)

    const exactDate = new Date(parsedFields.data.date)
    const reportDate = new Date(Date.UTC(exactDate.getUTCFullYear(), exactDate.getUTCMonth(), exactDate.getUTCDate()))

    const newMemory = {
      time: parsedFields.data.time || undefined,
      text: parsedFields.data.text,
      location: parsedFields.data.location || undefined,
      lat: parsedFields.data.lat ?? photoWithGps?.lat,
      lng: parsedFields.data.lng ?? photoWithGps?.lng,
      photos,
      authorId: session.user.id,
      tags: tags.length ? tags : undefined
    }

    const report = await DailyReport.findOneAndUpdate(
      { date: reportDate },
      { $push: { memories: newMemory } },
      { returnDocument: 'after', upsert: true }
    ).populate('memories.authorId', 'name username').lean()

    return serializeDailyReport(report as unknown as LeanDailyReport)
  } catch (error: any) {
    console.error('[memories:create] Nepodařilo se uložit vzpomínku', {
      userId: session.user.id,
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