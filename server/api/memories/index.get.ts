import { z } from 'zod'

// Nechal jsem tvůj z.iso.datetime(), pokud ti v Zodu funguje bez problémů
const querySchema = z.object({
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Neplatné parametry dotazu.' })
  }

  const { start, end, before, limit } = parsed.data

  // Range mode: Vybráno v kalendáři (uživatel chce vidět konkrétní dny)
  if (start && end) {
    const reports = await DailyReport.find({ 
      date: { $gte: new Date(start), $lte: new Date(end) } 
    })
      .sort({ date: 1 }) // V kalendáři dává smysl číst dny od nejstaršího (např. od 1. do 5. července)
      .populate('memories.authorId', 'name username') // ZMĚNA: populate se musí zanořit do pole memories 
      .lean()

    return {
      items: reports.map(r => serializeDailyReport(r as any)),
      hasMore: false
    }
  }

  // Feed mode: Hlavní stránka s nekonečným posuvem
  const filter: Record<string, unknown> = {}
  if (before) {
    // Kurzorové stránkování: Načti dny starší než datum na konci seznamu
    filter.date = { $lt: new Date(before) }
  }

  const page = await DailyReport.find(filter)
    .sort({ date: -1 }) // Nejnovější dny jako první (např. Dnešek -> Včerejšek)
    .limit(limit + 1)
    .populate('memories.authorId', 'name username') // ZMĚNA: zanořený populate
    .populate('memories.photos.authorId', 'name username') // ZMĚNA: zanořený populate pro autora fotek
    .lean()

  const hasMore = page.length > limit
  const items = page.slice(0, limit)

  return {
    items: items.map(r => serializeDailyReport(r as any)),
    hasMore
  }
})