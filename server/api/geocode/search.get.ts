import { z } from 'zod'

const querySchema = z.object({
  q: z.string().trim().min(2).max(200)
})

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Zadej alespoň 2 znaky pro hledání.' })
  }

  try {
    const results = await $fetch<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
      query: {
        format: 'jsonv2',
        q: parsed.data.q,
        limit: 5
      },
      headers: {
        'User-Agent': 'Spolu/1.0 (soukroma aplikace na sdilene vzpominky)',
        'Accept-Language': 'cs'
      }
    })

    return results.map(result => ({
      label: result.display_name,
      lat: Number(result.lat),
      lng: Number(result.lon)
    }))
  } catch {
    throw createError({ statusCode: 502, message: 'Vyhledávání míst se nezdařilo, zkus to prosím znovu.' })
  }
})
