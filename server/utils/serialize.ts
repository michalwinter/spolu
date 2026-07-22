interface LeanPhoto {
  _id: { toString(): string }
  filename: string
  thumbnailFilename: string
  width?: number
  height?: number
}

interface LeanAuthor {
  _id: { toString(): string }
  name: string
  username: string
}

// 1. Nový interface pro jednotlivou událost (bývalé Memory, nyní vnořené)
interface LeanDailyMemory {
  _id: { toString(): string }
  time?: string
  text: string
  location?: string
  lat?: number
  lng?: number
  photos?: LeanPhoto[]
  authorId: LeanAuthor | { toString(): string } | null
  tags?: string[]
}

// 2. Nový interface pro hlavní dokument celého dne
export interface LeanDailyReport {
  _id: { toString(): string }
  date: Date
  title?: string
  memories?: LeanDailyMemory[]
  createdAt?: Date
  updatedAt?: Date
}

export interface SerializedDailyReport {
  id: string
  date: Date
  title: string | null
  memories: {
    id: string
    time: string | null
    text: string
    location: string | null
    lat?: number
    lng?: number
    tags: string[]
    photos: {
      id: string
      filename: string
      thumbnailFilename: string
      width?: number
      height?: number
    }[]
    author: {
      id: string
      name: string
      username: string
    } | null
  }[]
  createdAt?: Date
  updatedAt?: Date
}

// 3. Hlavní serializační funkce
export function serializeDailyReport(doc: LeanDailyReport): SerializedDailyReport {
  const rawMemories = doc.memories || []

  // Seřazení událostí uvnitř dne podle času (aby vznikl chronologický příběh)
  // Události bez vyplněného času spadnou přirozeně na začátek dne
  const sortedMemories = rawMemories.sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return -1
    if (!b.time) return 1
    return a.time.localeCompare(b.time)
  })

  return {
    id: doc._id.toString(),
    date: doc.date,
    title: doc.title || null,
    // Namapování seřazených událostí
    memories: sortedMemories.map(memory => {
      const author = memory.authorId as LeanAuthor | null
      const isPopulatedAuthor = !!author && typeof author === 'object' && 'name' in author

      return {
        id: memory._id?.toString() || '',
        time: memory.time || null,
        text: memory.text,
        location: memory.location || null,
        lat: typeof memory.lat === 'number' ? memory.lat : undefined,
        lng: typeof memory.lng === 'number' ? memory.lng : undefined,
        tags: memory.tags || [],
        photos: (memory.photos || []).map(photo => ({
          id: photo._id.toString(),
          filename: photo.filename,
          thumbnailFilename: photo.thumbnailFilename,
          width: photo.width,
          height: photo.height
        })),
        author: isPopulatedAuthor
          ? { id: author!._id.toString(), name: author!.name, username: author!.username }
          : null
      }
    }),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  }
}