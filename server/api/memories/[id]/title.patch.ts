import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().trim().max(100)
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = getRouterParam(event, 'id')
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 400, message: 'Neplatné ID denního reportu.' })
  }

  const parsedBody = bodySchema.safeParse(await readBody(event))
  if (!parsedBody.success) {
    throw createError({ statusCode: 400, message: 'Neplatný název dne.' })
  }

  const report = await DailyReport.findById(id)
  if (!report) {
    throw createError({ statusCode: 404, message: 'Denní report nenalezen.' })
  }

  report.title = parsedBody.data.title
  await report.save()

  return { 
    report: serializeDailyReport(report.toObject({ virtuals: true }) as any),
  }
});
