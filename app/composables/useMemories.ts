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

/** Builds the URL for a stored photo (served through an authenticated API route). */
export function photoUrl(filename: string) {
  return `/api/photos/${filename}`
}

export function useMemories() {
  const reportsById = useState<Record<string, SerializedDailyReport>>('daily-reports-by-id', () => ({}))
  const timelineReportIds = useState<string[]>('daily-report-timeline-ids', () => [])

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
  }

  function replaceTimelineReports(reports: SerializedDailyReport[]) {
    reportsById.value = { ...reportsById.value }

    for (const report of reports) {
      reportsById.value[report.id] = report
    }

    timelineReportIds.value = reports.map(report => report.id)
    sortTimelineReportIds()
  }

  function appendTimelineReports(reports: SerializedDailyReport[]) {
    upsertReports(reports)
  }

  function removeReport(reportId: string) {
    timelineReportIds.value = timelineReportIds.value.filter(id => id !== reportId)

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

  function fetchLatestPage(before?: string, limit = 20) {
    return $fetch<MemoriesPage>('/api/memories', {
      query: { before, limit }
    })
  }

  function fetchByRange(startISO: string, endISO: string) {
    return $fetch<MemoriesPage>('/api/memories', {
      query: { start: startISO, end: endISO }
    })
  }

  async function fetchSummary(startISO?: string, endISO?: string) {
    const summary = useState<string[] | null>('memoriesSummary', () => null)
    const changed = useState<boolean>('memoriesChanged', () => false)
    if (summary.value && !changed.value) {
      return Promise.resolve(summary.value)
    } else {
      const data = await $fetch<{ dates: string[]} >('/api/memories/summary', {
        query: { start: startISO, end: endISO }
      })
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

  function buildFormData(payload: MemoryFormPayload) {
    const formData = new FormData()
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

  function createMemory(payload: MemoryFormPayload) {
    return $fetch<SerializedDailyReport>('/api/memories', {
      method: 'POST',
      body: buildFormData(payload)
    }).then((report) => {
      upsertReports([report])
      return { report }
    })
  }

  function updateMemory(id: string,mid: string, payload: MemoryFormPayload) {
    return $fetch<ReportActionResponse>(`/api/memories/${id}/${mid}`, {
      method: 'PATCH',
      body: buildFormData(payload)
    }).then((response) => {
      applyReportActionResponse(response)
      return response
    })
  }

  function removeMemory(id: string, mid?: string) {
    if (!mid) {
      return $fetch(`/api/memories/${id}`, { method: 'DELETE' as any })
    }

    return $fetch<ReportActionResponse>(`/api/memories/${id}/${mid}`, { method: 'DELETE' as any })
      .then((response) => {
        applyReportActionResponse(response)
        return response
      })
  }

  function updateDayTitle(reportId: string, newTitle: string) {
    return $fetch<ReportActionResponse>(`/api/memories/${reportId}/title`, {
      method: 'PATCH',
      body: { title: newTitle }
    }).then((response) => {
      applyReportActionResponse(response)
      return response
    })
  }


  return {
    fetchLatestPage,
    fetchByRange,
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
  }
}