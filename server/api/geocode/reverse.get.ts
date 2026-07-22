import { z } from 'zod'

const runtimeConfig = useRuntimeConfig()
const mapyApiKey = runtimeConfig.public.mapyApiKey

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180)
})

interface NominatimReverseResult {
  display_name?: string
}

interface MapyReverseItem {
  name: string
  label: string
  position: {
    lon: number
    lat: number
  },
  type: string
  location: string
  zpi: string
  bbox: number[],
  regionalStructure: {
    name: string
    type: string
  }[]
}

interface MapyReverseResult {
  items: MapyReverseItem[]
}

async function reverseMapy(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await $fetch<MapyReverseResult>('https://api.mapy.com/v1/rgeocode', {
      query: {
        lat,
        lon: lng,
        lang: 'cs',
        apikey: mapyApiKey
      }
    })
    
    if (result.items.length > 0 && result.items[0]) {
      const cityPart = result.items[0].regionalStructure.find(item => item.type === 'regional.municipality_part')
      const city = result.items[0].regionalStructure.find(item => item.type === 'regional.municipality');
      
      if (cityPart && city) {
        if (cityPart.name === city.name) {
          return city.name
        }
        return `${cityPart.name}, ${city.name}`
      } else if (city) {
        return city.name
      } else if (cityPart) {
        return cityPart.name
      } else {
        return result.items[0].location || null
      }
    } else {
      return null
    }
  } catch {
    return null
  }
}

async function reverseNominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await $fetch<NominatimReverseResult>('https://nominatim.openstreetmap.org/reverse', {
      query: {
        format: 'jsonv2',
        lat,
        lon: lng
      },
      headers: {
        'User-Agent': 'Spolu/1.0 (soukromá aplikace na sdílené vzpomínky)',
        'Accept-Language': 'cs'
      }
    })
    return result.display_name ?? null
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Neplatné souřadnice.' })
  }

  const { lat, lng } = parsed.data;

  const location = await reverseMapy(lat, lng)

  console.log('Reverse geocoding result:', location);

  return {
    location
  }
})
