import { isValidObjectId } from 'mongoose'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

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
  const filenames = (memory.photos || []).flatMap((photo: { filename: string, thumbnailFilename: string }) => [photo.filename, photo.thumbnailFilename])

  report.memories.splice(memoryIndex, 1)

  if (report.memories.length) {
    await report.save()

    const updatedReport = await DailyReport.findById(reportId)
      .populate('memories.authorId', 'name username')
      .lean()

    if (filenames.length) {
      await deletePhotoFiles(filenames)
    }

    return {
      report: updatedReport ? serializeDailyReport(updatedReport as any) : null,
      removedReportId: null
    }
  }

  await report.deleteOne()

  if (filenames.length) {
    await deletePhotoFiles(filenames)
  }

  return {
    report: null,
    removedReportId: reportId
  }
})