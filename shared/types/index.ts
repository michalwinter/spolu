import type { SerializedDailyReport } from '~~/server/utils/serialize'

export type MemoriesGetResponse = {
  items: SerializedDailyReport[]
  hasMore: boolean
}

export type SerializedAuthor = {
  id: string
  name: string
  username: string
} | null

export interface GalleryPhoto {
  filename: string
  thumbnailFilename: string
  width?: number
  height?: number
  mimeType: string
  author: SerializedAuthor
  memory: {
    date: string
    reportTitle?: string
    text: string
    time?: string
    location?: string
    lat?: number
    lng?: number
  }
}