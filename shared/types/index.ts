import type { SerializedDailyReport } from '~~/server/utils/serialize'

export type MemoriesGetResponse = {
  items: SerializedDailyReport[]
  hasMore: boolean
}