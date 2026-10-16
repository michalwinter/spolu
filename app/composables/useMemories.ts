import type { GalleryPhoto } from '~~/shared/types'
import {
  deleteCachedReport,
  enqueueCreate,
  listQueuedCreates,
  putCachedReports,
  readCachedReports,
  removeQueuedCreate,
  replaceCachedReports,
  updateQueuedCreate,
  type QueuedCreatePayload,
} from './memoryOfflineStore'
import { cachePhotos, collectPhotoFilenames, prunePhotoCache } from './memoryPhotoCache'

export interface MemoryPhoto {
  id: string
  filename: string
  thumbnailFilename: string
  width?: number
  height?: number
}

export interface MemoryAuthor {
  id: string
  name: string
  username: string
}

export interface Memory {
  id: string
  time: string | null
  text: string
  location: string | null
  lat?: number
  lng?: number
  photos: MemoryPhoto[]
  author: MemoryAuthor | null
  createdAt?: string
  updatedAt?: string
}

export interface DailyReport {
  id: string
  date: Date
  title: string | null
  memories: Memory[]
  createdAt?: string
  updatedAt?: string
}

export interface MemoriesPage {
  items: SerializedDailyReport[]
  hasMore: boolean
}

export interface MemoryFormPayload {
  date: Date
  time?: string
  text: string
  location?: string
  lat?: number
  lng?: number
  tags?: string[]
  photos: File[]
  removePhotoIds?: string[]
}

export interface ReportActionResponse {
  report?: SerializedDailyReport | null
  previousReport?: SerializedDailyReport | null
  removedReportId?: string | null
}

export interface PendingCreatePreview {
  id: string
  createdAt: string
  text: string
  dateISO: string
  time?: string
  location?: string
  tags: string[]
  photoCount: number
  attempts: number
  lastError?: string
}

const READ_TIMEOUT_MS = 6000
const FULL_SYNC_PAGE_SIZE = 100
const FULL_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000

let lastFullSyncAt = 0

/** The request never got an answer from the server (offline, DNS failure, timeout). */
function isLikelyNetworkError(error: unknown) {
  const candidate = error as any
  const statusCode = candidate?.statusCode || candidate?.response?.status

  if (statusCode) {
    return false
  }

  const names = [candidate?.name, candidate?.cause?.name]
  if (names.includes('AbortError') || names.includes('TimeoutError')) {
    return true
  }

  const message = String(candidate?.message || '').toLowerCase()
  return message.includes('network') || message.includes('fetch') || message.includes('failed')
}

/** Like a network error, but also a reverse proxy answering while the app behind it is down. */
function isServerUnavailable(error: unknown) {
  const candidate = error as any
  const statusCode = candidate?.statusCode || candidate?.response?.status
  return isLikelyNetworkError(error) || [502, 503, 504].includes(statusCode)
}

function requireOnline() {
  if (import.meta.client && !navigator.onLine) {
    throw new Error('Tato akce vyžaduje připojení k internetu.')
  }
}

function dayKey(report: SerializedDailyReport) {
  return new Date(report.date).toISOString().split('T')[0]!
}

function toISOString(value: Date | string) {
  return new Date(value).toISOString()
}

/** Builds the URL for a stored photo (served through an authenticated API route). */
export function photoUrl(filename: string) {
  return `/api/photos/${filename}`
}

export function useMemories() {
  const { user } = useUserSession()
  const reportsById = useState<Record<string, SerializedDailyReport>>('daily-reports-by-id', () => ({}))
  const timelineReportIds = useState<string[]>('daily-report-timeline-ids', () => [])
  const pendingCreates = useState<PendingCreatePreview[]>('pending-memory-creates', () => [])
  const pendingCreatesCount = computed(() => pendingCreates.value.length)
  const isSyncingPendingCreates = useState<boolean>('pending-memory-creates-syncing', () => false)
  const isSyncingOfflineData = useState<boolean>('offline-data-syncing', () => false)
  const offlineInitialized = useState<boolean>('offline-memories-initialized', () => false)
  const offlineListenersAttached = useState<boolean>('offline-memories-listeners-attached', () => false)

  function logOfflineError(error: unknown) {
    console.warn('[offline] Local storage operation failed', error)
  }

  async function refreshPendingCreates() {
    if (!import.meta.client) {
      return
    }

    const items = await listQueuedCreates(user.value?.id)
    pendingCreates.value = items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      text: item.payload.text,
      dateISO: item.payload.dateISO,
      time: item.payload.time,
      location: item.payload.location,
      tags: item.payload.tags ?? [],
      photoCount: item.payload.photos.length,
      attempts: item.attempts,
      lastError: item.lastError,
    }))
  }

  function persistReports(reports: SerializedDailyReport[]) {
    void putCachedReports(reports).catch(logOfflineError)
  }

  function sortTimelineReportIds() {
    timelineReportIds.value = [...new Set(timelineReportIds.value)]
      .filter(id => !!reportsById.value[id])
      .sort((leftId, rightId) => {
        const leftDate = new Date(reportsById.value[leftId]!.date).getTime()
        const rightDate = new Date(reportsById.value[rightId]!.date).getTime()
        return rightDate - leftDate
      })
  }

  function getReportById(id: string) {
    return reportsById.value[id] ?? null
  }

  function upsertReports(reports: SerializedDailyReport[]) {
    if (!reports.length) {
      return
    }

    reportsById.value = { ...reportsById.value }

    for (const report of reports) {
      reportsById.value[report.id] = report
      if (!timelineReportIds.value.includes(report.id)) {
        timelineReportIds.value.push(report.id)
      }
    }

    sortTimelineReportIds()
    persistReports(reports)
  }

  function replaceTimelineReports(reports: SerializedDailyReport[]) {
    reportsById.value = { ...reportsById.value }

    for (const report of reports) {
      reportsById.value[report.id] = report
    }

    timelineReportIds.value = reports.map(report => report.id)
    sortTimelineReportIds()
    persistReports(reports)
  }

  function appendTimelineReports(reports: SerializedDailyReport[]) {
    upsertReports(reports)
  }

  function removeReport(reportId: string) {
    timelineReportIds.value = timelineReportIds.value.filter(id => id !== reportId)
    void deleteCachedReport(reportId).catch(logOfflineError)

    if (!reportsById.value[reportId]) {
      return
    }

    const nextReports = { ...reportsById.value }
    delete nextReports[reportId]
    reportsById.value = nextReports
  }

  function applyReportActionResponse(response: ReportActionResponse) {
    if (response.previousReport) {
      upsertReports([response.previousReport])
    }

    if (response.removedReportId) {
      removeReport(response.removedReportId)
    }

    if (response.report) {
      upsertReports([response.report])
    }
  }

  async function readCachedPage(before?: string, limit = 20): Promise<MemoriesPage> {
    const beforeTime = before ? new Date(before).getTime() : Number.POSITIVE_INFINITY
    const older = (await readCachedReports())
      .filter(report => new Date(report.date).getTime() < beforeTime)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

    return { items: older.slice(0, limit), hasMore: older.length > limit }
  }

  async function readCachedRange(startISO: string, endISO: string): Promise<MemoriesPage> {
    const start = new Date(startISO).getTime()
    const end = new Date(endISO).getTime()
    const items = (await readCachedReports())
      .filter((report) => {
        const time = new Date(report.date).getTime()
        return time >= start && time <= end
      })
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

    return { items, hasMore: false }
  }

  /** Serves the page from the server, or from the offline copy when the server cannot be reached. */
  async function fetchLatestPage(before?: string, limit = 20) {
    try {
      return await $fetch<MemoriesPage>('/api/memories', {
        query: { before, limit },
        timeout: READ_TIMEOUT_MS
      })
    } catch (error) {
      if (!import.meta.client || !isServerUnavailable(error)) {
        throw error
      }

      return readCachedPage(before, limit)
    }
  }

  async function fetchByRange(startISO: string, endISO: string) {
    try {
      return await $fetch<MemoriesPage>('/api/memories', {
        query: { start: startISO, end: endISO },
        timeout: READ_TIMEOUT_MS
      })
    } catch (error) {
      if (!import.meta.client || !isServerUnavailable(error)) {
        throw error
      }

      return readCachedRange(startISO, endISO)
    }
  }

  async function fetchGallery(): Promise<GalleryPhoto[]> {
    try {
      return await $fetch<GalleryPhoto[]>('/api/gallery', { timeout: READ_TIMEOUT_MS })
    } catch (error) {
      if (!import.meta.client || !isServerUnavailable(error)) {
        throw error
      }

      const reports = (await readCachedReports())
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

      // Same order as the server: newest day first, and the later memory / photo first within a day.
      return reports.flatMap(report => [...report.memories].reverse().flatMap(memory =>
        [...memory.photos].reverse().map((photo): GalleryPhoto => ({
          filename: photo.filename,
          thumbnailFilename: photo.thumbnailFilename,
          width: photo.width,
          height: photo.height,
          mimeType: '',
          author: photo.author,
          memory: {
            date: toISOString(report.date),
            reportTitle: report.title ?? undefined,
            text: memory.text,
            time: memory.time ?? undefined,
            location: memory.location ?? undefined,
            lat: memory.lat,
            lng: memory.lng
          }
        }))
      ))
    }
  }

  async function fetchSummary(startISO?: string, endISO?: string) {
    const summary = useState<string[] | null>('memoriesSummary', () => null)
    const changed = useState<boolean>('memoriesChanged', () => false)
    if (summary.value && !changed.value) {
      return Promise.resolve(summary.value)
    } else {
      let data: { dates: string[] }

      try {
        data = await $fetch<{ dates: string[] }>('/api/memories/summary', {
          query: { start: startISO, end: endISO },
          timeout: READ_TIMEOUT_MS
        })
      } catch (error) {
        if (!import.meta.client || !isServerUnavailable(error)) {
          throw error
        }

        const start = startISO ? new Date(startISO).getTime() : Number.NEGATIVE_INFINITY
        const end = endISO ? new Date(endISO).getTime() : Number.POSITIVE_INFINITY
        const dates = (await readCachedReports())
          .filter((report) => {
            const time = new Date(report.date).getTime()
            return time >= start && time <= end
          })
          .map(dayKey)
          .sort()

        // Not stored in the shared state so the next online call refreshes it.
        return dates
      }

      summary.value = data.dates
      changed.value = false
      return summary.value
    }
  }

  function markSummaryChanged() {
    const changed = useState<boolean>('memoriesChanged', () => false)
    changed.value = true
  }

  // function fetchOne(id: string) {
  //   return $fetch<{ report: SerializedDailyReport }>(`/api/memories/${id}`)
  // }

  function buildFormData(payload: MemoryFormPayload, clientId?: string) {
    const formData = new FormData()
    if (clientId) {
      formData.set('clientId', clientId)
    }
    formData.set('date', payload.date.toISOString())
    if (payload.time) {
      formData.set('time', payload.time)
    }
    formData.set('text', payload.text)
    formData.set('location', payload.location ?? '')

    if (typeof payload.lat === 'number' && typeof payload.lng === 'number') {
      formData.set('lat', String(payload.lat))
      formData.set('lng', String(payload.lng))
    } else {
      formData.set('lat', '')
      formData.set('lng', '')
    }

    if (payload.removePhotoIds?.length) {
      formData.set('removePhotoIds', JSON.stringify(payload.removePhotoIds))
    }

    if (payload.tags?.length) {
      formData.set('tags', JSON.stringify(payload.tags))
    }

    for (const photo of payload.photos) {
      formData.append('photos', photo)
    }

    return formData
  }

  async function createMemoryOnline(payload: MemoryFormPayload, clientId: string) {
    const report = await $fetch<SerializedDailyReport>('/api/memories', {
      method: 'POST',
      body: buildFormData(payload, clientId)
    })

    upsertReports([report])
    prefetchPhotos([report])
    return { report }
  }

  /** Stores the photos of freshly saved reports so they are available offline right away. */
  function prefetchPhotos(reports: SerializedDailyReport[]) {
    const { thumbnails, originals } = collectPhotoFilenames(reports)
    void cachePhotos([...thumbnails, ...originals]).catch(logOfflineError)
  }

  function toQueuedCreatePayload(payload: MemoryFormPayload): QueuedCreatePayload {
    return {
      dateISO: payload.date.toISOString(),
      time: payload.time,
      text: payload.text,
      location: payload.location,
      lat: payload.lat,
      lng: payload.lng,
      tags: payload.tags ? [...payload.tags] : undefined,
      removePhotoIds: payload.removePhotoIds ? [...payload.removePhotoIds] : undefined,
      photos: payload.photos.map(photo => ({
        name: photo.name,
        type: photo.type,
        lastModified: photo.lastModified,
        blob: toRaw(photo),
      })),
    }
  }

  function fromQueuedCreatePayload(payload: QueuedCreatePayload): MemoryFormPayload {
    return {
      date: new Date(payload.dateISO),
      time: payload.time,
      text: payload.text,
      location: payload.location,
      lat: payload.lat,
      lng: payload.lng,
      tags: payload.tags,
      removePhotoIds: payload.removePhotoIds,
      photos: payload.photos.map((photo) => new File([photo.blob], photo.name, {
        type: photo.type,
        lastModified: photo.lastModified,
      })),
    }
  }

  async function syncPendingCreates() {
    if (!import.meta.client || isSyncingPendingCreates.value || !navigator.onLine) {
      return
    }

    isSyncingPendingCreates.value = true

    try {
      const queuedItems = await listQueuedCreates(user.value?.id)

      for (const item of queuedItems) {
        try {
          await createMemoryOnline(fromQueuedCreatePayload(item.payload), item.id)
          await removeQueuedCreate(item.id)
        } catch (error: any) {
          item.attempts += 1
          item.lastError = error?.data?.message || error?.message || 'Nepodarilo se odeslat.'
          await updateQueuedCreate(item)

          const statusCode = error?.statusCode || error?.response?.status
          if (statusCode === 401 || statusCode === 403) {
            break
          }
        }
      }
    } finally {
      isSyncingPendingCreates.value = false
      await refreshPendingCreates()
    }
  }

  /** Downloads every memory plus its photos so the whole app keeps working without a connection. */
  async function syncOfflineData(force = false) {
    if (!import.meta.client || isSyncingOfflineData.value || !navigator.onLine) {
      return
    }

    if (!force && Date.now() - lastFullSyncAt < FULL_SYNC_MIN_INTERVAL_MS) {
      return
    }

    isSyncingOfflineData.value = true

    try {
      const reports: SerializedDailyReport[] = []
      let before: string | undefined

      for (;;) {
        const page = await $fetch<MemoriesPage>('/api/memories', {
          query: { before, limit: FULL_SYNC_PAGE_SIZE },
          timeout: 30000
        })

        reports.push(...page.items)

        const last = page.items[page.items.length - 1]
        if (!page.hasMore || !last) {
          break
        }

        before = toISOString(last.date)
      }

      await replaceCachedReports(reports)
      lastFullSyncAt = Date.now()

      const serverIds = new Set(reports.map(report => report.id))
      const nextReports = { ...reportsById.value }
      for (const report of reports) {
        if (nextReports[report.id]) {
          nextReports[report.id] = report
        }
      }
      reportsById.value = nextReports
      timelineReportIds.value = timelineReportIds.value.filter(id => serverIds.has(id))

      const { thumbnails, originals } = collectPhotoFilenames(reports)
      await cachePhotos(thumbnails)
      await cachePhotos(originals)
      await prunePhotoCache(new Set([...thumbnails, ...originals]))
    } catch (error) {
      console.warn('[offline] Full sync failed', error)
    } finally {
      isSyncingOfflineData.value = false
    }
  }

  async function syncAll() {
    await syncPendingCreates()
    await syncOfflineData(true)
  }

  async function queueCreateMemory(payload: MemoryFormPayload, clientId: string) {
    await enqueueCreate(toQueuedCreatePayload(payload), user.value?.id, clientId)
    await refreshPendingCreates()
  }

  async function initializeOfflineMode() {
    await refreshPendingCreates()

    if (!offlineListenersAttached.value) {
      offlineListenersAttached.value = true

      window.addEventListener('online', () => {
        void syncPendingCreates().then(() => syncOfflineData(true))
      })

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void syncPendingCreates().then(() => syncOfflineData())
        }
      })
    }

    // Keeps the browser from evicting the offline copy when storage runs low.
    void navigator.storage?.persist?.().catch(() => undefined)

    if (navigator.onLine) {
      await syncPendingCreates()
      void syncOfflineData()
    }
  }

  async function createMemory(payload: MemoryFormPayload): Promise<{ report: SerializedDailyReport | null, queued?: boolean }> {
    const clientId = crypto.randomUUID()

    if (import.meta.client && !navigator.onLine) {
      await queueCreateMemory(payload, clientId)
      return { report: null, queued: true }
    }

    try {
      return await createMemoryOnline(payload, clientId)
    } catch (error) {
      if (import.meta.client && isLikelyNetworkError(error)) {
        await queueCreateMemory(payload, clientId)
        return { report: null, queued: true }
      }

      throw error
    }
  }

  function updateMemory(id: string,mid: string, payload: MemoryFormPayload) {
    requireOnline()

    return $fetch<ReportActionResponse>(`/api/memories/${id}/${mid}`, {
      method: 'PATCH',
      body: buildFormData(payload)
    }).then((response) => {
      applyReportActionResponse(response)
      if (response.report) {
        prefetchPhotos([response.report])
      }
      return response
    })
  }

  function removeMemory(id: string, mid?: string) {
    requireOnline()

    if (!mid) {
      return $fetch(`/api/memories/${id}`, { method: 'DELETE' as any }).then((response) => {
        removeReport(id)
        return response
      })
    }

    return $fetch<ReportActionResponse>(`/api/memories/${id}/${mid}`, { method: 'DELETE' as any })
      .then((response) => {
        applyReportActionResponse(response)
        return response
      })
  }

  function updateDayTitle(reportId: string, newTitle: string) {
    requireOnline()

    return $fetch<ReportActionResponse>(`/api/memories/${reportId}/title`, {
      method: 'PATCH',
      body: { title: newTitle }
    }).then((response) => {
      applyReportActionResponse(response)
      return response
    })
  }

  if (import.meta.client && !offlineInitialized.value && user.value) {
    offlineInitialized.value = true
    void initializeOfflineMode().catch(logOfflineError)
  }


  return {
    fetchLatestPage,
    fetchByRange,
    fetchGallery,
    fetchSummary,
    createMemory,
    updateMemory,
    markSummaryChanged,
    removeMemory,
    updateDayTitle,
    reportsById,
    timelineReportIds,
    getReportById,
    replaceTimelineReports,
    appendTimelineReports,
    removeReport,
    applyReportActionResponse,
    pendingCreates,
    pendingCreatesCount,
    isSyncingPendingCreates,
    isSyncingOfflineData,
    syncPendingCreates,
    syncAll,
  }
}