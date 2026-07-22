import { z } from 'zod'

const querySchema = z.object({
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional()
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Neplatné parametry dotazu.' })
  }

  const { start, end } = parsed.data
  const dateFilter: Record<string, Date> = {}

  if (start) {
    dateFilter.$gte = new Date(start)
  }

  if (end) {
    dateFilter.$lte = new Date(end)
  }

  const reports = await DailyReport.find(Object.keys(dateFilter).length ? { date: dateFilter } : {})
    .select('date')
    .sort({ date: 1 })
    .lean()

  // Rovnou na serveru vytvoříme pole čistých stringů (např. '2026-07-15')
  const dates = reports.map(report => report.date.toISOString().split('T')[0])

  return { dates }
})