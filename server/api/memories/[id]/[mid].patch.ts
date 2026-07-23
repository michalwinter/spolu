import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

const fieldsSchema = z.object({
	date: z.iso.datetime(),
	time: z.string().trim().max(5).optional(),
	text: z.string().trim().min(1).max(5000),
	location: z.string().trim().max(200).optional(),
	lat: z.coerce.number().min(-90).max(90).optional(),
	lng: z.coerce.number().min(-180).max(180).optional(),
	tags: z.string().optional(),
	removePhotoIds: z.string().optional()
})

const MAX_PHOTOS_PER_MEMORY = 20

interface PhotoSubdoc {
	_id: { toString(): string }
	filename: string
	thumbnailFilename: string
}

function normalizeReportDate(value: Date) {
	return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export default defineEventHandler(async (event) => {
	const session = await requireUserSession(event)

	const reportId = getRouterParam(event, 'id')
	const memoryId = getRouterParam(event, 'mid')

	if (!reportId || !isValidObjectId(reportId)) {
		throw createError({ statusCode: 400, message: 'Neplatné ID denního reportu.' })
	}

	if (!memoryId || !isValidObjectId(memoryId)) {
		throw createError({ statusCode: 400, message: 'Neplatné ID vzpomínky.' })
	}

	const report = await DailyReport.findById(reportId)
	if (!report) {
		throw createError({ statusCode: 404, message: 'Denní report nenalezen.' })
	}

	const memoryIndex = report.memories.findIndex((item: any) => item._id?.toString() === memoryId)
	if (memoryIndex === -1) {
		throw createError({ statusCode: 404, message: 'Vzpomínka nenalezena.' })
	}

	const memory = report.memories[memoryIndex] as any

	const parts = await readMultipartFormData(event)
	if (!parts) {
		throw createError({ statusCode: 400, message: 'Chybí data formuláře.' })
	}

	const fields: Record<string, string> = {}
	const fileParts: Array<{ filename?: string, type?: string, data: Buffer }> = []

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

	const existingPhotos = memory.photos as unknown as PhotoSubdoc[]
	const photosToRemove = existingPhotos.filter(photo => removeIds.includes(photo._id.toString()))
	const remainingPhotos = existingPhotos.filter(photo => !removeIds.includes(photo._id.toString()))

	let newPhotos = []
	for (const part of fileParts) {
		newPhotos.push({ ...(await saveUploadedPhoto(part)), authorId: session.user.id })
	}

	if (remainingPhotos.length + newPhotos.length > MAX_PHOTOS_PER_MEMORY) {
		throw createError({ statusCode: 400, message: `Vzpomínka může mít maximálně ${MAX_PHOTOS_PER_MEMORY} fotek.` })
	}

	const photoWithGps = newPhotos.find(photo => photo.lat !== undefined && photo.lng !== undefined)
	const exactDate = new Date(parsedFields.data.date)
	const nextReportDate = normalizeReportDate(exactDate)
	const currentReportDate = normalizeReportDate(report.date)

	const updatedMemory = {
		time: parsedFields.data.time || undefined,
		text: parsedFields.data.text,
		location: parsedFields.data.location || undefined,
		lat: parsedFields.data.lat ?? photoWithGps?.lat,
		lng: parsedFields.data.lng ?? photoWithGps?.lng,
		photos: [...remainingPhotos, ...newPhotos],
		authorId: memory.authorId,
		tags: tags.length ? tags : undefined
	}

	let updatedReportId = reportId
	let previousReport: SerializedDailyReport | null = null
	let removedReportId: string | null = null

	if (currentReportDate.getTime() === nextReportDate.getTime()) {
		memory.set(updatedMemory)
		await report.save()
	} else {
		report.memories.splice(memoryIndex, 1)

		if (report.memories.length) {
			await report.save()

			const previousReportDoc = await DailyReport.findById(reportId)
				.populate('memories.authorId', 'name username')
				.lean()

			previousReport = previousReportDoc ? serializeDailyReport(previousReportDoc as any) : null
		} else {
			await report.deleteOne()
			removedReportId = reportId
		}

		const movedToReport = await DailyReport.findOneAndUpdate(
			{ date: nextReportDate },
			{ $push: { memories: updatedMemory } },
			{ returnDocument: 'after', upsert: true }
		)

		updatedReportId = movedToReport!._id.toString()
	}

	if (photosToRemove.length) {
		await deletePhotoFiles(photosToRemove.flatMap(photo => [photo.filename, photo.thumbnailFilename]))
	}

	const updatedReport = await DailyReport.findById(updatedReportId)
		.populate('memories.authorId', 'name username')
		.lean()

	return {
		report: serializeDailyReport(updatedReport as any),
		previousReport,
		removedReportId,
	}
})
