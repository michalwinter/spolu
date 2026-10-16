<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

const limit = 5 // Počet dnů na jedno načtení
const hasMore = ref(true)
const pending = ref(false)
const bottomObserver = ref<HTMLElement | null>(null)
const {
  fetchLatestPage,
  timelineReportIds,
  getReportById,
  pendingCreates,
  replaceTimelineReports,
  appendTimelineReports,
} = useMemories()

const pendingSections = computed(() => {
  const grouped = new Map<string, typeof pendingCreates.value>()

  for (const item of pendingCreates.value) {
    const dayKey = item.dateISO.split('T')[0] || item.dateISO
    const group = grouped.get(dayKey)

    if (group) {
      group.push(item)
    } else {
      grouped.set(dayKey, [item])
    }
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([dayKey, items]) => ({
      dayKey,
      items: [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      label: new Date(dayKey).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }))
})

// Served from the server, or from the offline copy when the server cannot be reached.
try {
  const data = await fetchLatestPage(undefined, limit)

  if (!timelineReportIds.value.length) {
    replaceTimelineReports(data.items)
    hasMore.value = data.hasMore
  } else {
    appendTimelineReports(data.items)
  }
} catch (e) {
  console.error('[timeline] Initial fetch failed', e)
  hasMore.value = false
}

const loadMore = async () => {
  if (pending.value || !hasMore.value || timelineReportIds.value.length === 0) return
  
  pending.value = true

  try {
    const lastReportId = timelineReportIds.value[timelineReportIds.value.length - 1]
    const lastReport = lastReportId ? getReportById(lastReportId) : null
    if (!lastReport) {
      return
    }
    
    const res = await fetchLatestPage(lastReport.date, limit)

    appendTimelineReports(res.items)
    hasMore.value = res.hasMore
    
  } catch (e) {
    console.error('Chyba při načítání dalších dnů:', e)
  } finally {
    pending.value = false
  }
}

useIntersectionObserver(bottomObserver, ([entry]) => {
  if (entry?.isIntersecting) {
    loadMore()
  }
}, {
  rootMargin: '200px' 
})
</script>

<!-- <template>
  <UContainer class="py-12 max-w-3xl">
    <div v-if="error" class="p-4 bg-red-50 text-red-500 rounded-lg">
      Došlo k chybě při načítání dat.
    </div>

    <div v-else class="relative border-l-2 border-gray-200 dark:border-gray-800 ml-1 space-y-12">
      
      <div v-for="report in reports" :key="report.id" class="relative pl-8">
        
        <div class="absolute w-4 h-4 bg-primary-500 rounded-full -left-2.25 top-1.5 border-2 border-white dark:border-gray-900 z-10"></div>

        <div class="mb-5">
          <h2 class="text-xl font-semibold capitalize">
            {{ new Date(report.date).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
          </h2>
          <p v-if="report.title" class="text-gray-500 dark:text-gray-400 mt-1">{{ report.title }}</p>
        </div>

        <div class="space-y-6">
          <UCard v-for="(memory, idx) in report.memories" :key="idx" class="relative hover:shadow-sm transition-shadow">
            
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div class="flex flex-wrap items-center gap-3">
                <div v-if="memory.time" class="flex items-center text-sm font-medium text-primary-500">
                  <UIcon name="i-heroicons-clock" class="w-4 h-4 mr-1" />
                  {{ memory.time }}
                </div>
                <UBadge v-if="memory.location" color="neutral" variant="soft" size="sm">
                  <UIcon name="i-heroicons-map-pin" class="w-3 h-3 mr-1"/>
                  {{ memory.location }}
                </UBadge>
              </div>
              
              <div v-if="memory.author" class="text-xs text-gray-500 flex items-center gap-1">
                <UIcon name="i-heroicons-user" class="w-3 h-3" />
                {{ memory.author.name || memory.author.username }}
              </div>
            </div>

            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
              {{ memory.text }}
            </p>

            <div v-if="memory.photos?.length" class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <img
                v-for="photo in memory.photos"
                :key="photo.filename"
                :src="`/uploads/${photo.thumbnailFilename}`"
                :alt="photo.filename || 'Fotografie'"
                class="rounded-md object-cover aspect-square w-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
              />
            </div>

            <div v-if="memory.tags?.length" class="mt-4 flex flex-wrap gap-2">
              <UBadge v-for="tag in memory.tags" :key="tag" variant="subtle" color="primary" size="xs">
                #{{ tag }}
              </UBadge>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <div ref="bottomObserver" class="h-24 flex items-center justify-center mt-8">
      <UIcon 
        v-if="pending" 
        name="i-heroicons-arrow-path" 
        class="w-8 h-8 animate-spin text-primary-500" 
      />
      <div v-else-if="!hasMore && reports.length > 0" class="flex flex-col items-center text-gray-400">
        <UIcon name="i-heroicons-check-circle" class="w-6 h-6 mb-2" />
        <span class="text-sm">Jste na začátku deníku.</span>
      </div>
    </div>
  </UContainer>
</template> -->


<template>
  <div class="mt-7.5 flex flex-col gap-7.5">

    <section v-for="section in pendingSections" :key="section.dayKey" class="flex flex-col gap-3">
      <div class="flex items-center gap-2 text-sm text-highlighted font-semibold">
        <span>{{ section.label }}</span>
        <UBadge color="warning" variant="subtle" size="sm">Čeká na synchronizaci</UBadge>
      </div>

      <div class="rounded-lg flex flex-col overflow-hidden ring-2 ring-warning/40 divide-y divide-default bg-default/80">
        <article
          v-for="item in section.items"
          :key="item.id"
          class="p-4 flex flex-col gap-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="warning" variant="soft" size="sm">Offline</UBadge>
              <span v-if="item.time" class="text-sm text-toned">{{ item.time }}</span>
              <span v-if="item.location" class="text-sm text-toned">{{ item.location }}</span>
            </div>
            <span class="text-xs text-dimmed">{{ new Date(item.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) }}</span>
          </div>

          <p class="whitespace-pre-wrap text-sm leading-relaxed">{{ item.text }}</p>

          <div class="flex flex-wrap items-center gap-2 text-xs text-dimmed">
            <span v-if="item.photoCount">{{ item.photoCount }} {{ item.photoCount === 1 ? 'fotka' : item.photoCount >= 2 && item.photoCount <= 4 ? 'fotky' : 'fotek' }}</span>
            <span v-if="item.attempts > 0">Pokusy o odeslání: {{ item.attempts }}</span>
            <span v-if="item.lastError">{{ item.lastError }}</span>
          </div>

          <div v-if="item.tags.length" class="flex flex-wrap gap-1.5">
            <UBadge v-for="tag in item.tags" :key="tag" color="neutral" variant="soft" size="sm">
              #{{ tag }}
            </UBadge>
          </div>
        </article>
      </div>
    </section>

    <DailyReport v-for="reportId in timelineReportIds" :key="reportId" :report-id="reportId" />

    <div ref="bottomObserver" class="h-24 flex items-center justify-center mt-5">
      <div v-if="pending" class="flex flex-col items-center gap-2.5">
        <UIcon 
          name="ph:arrows-clockwise" 
          class="w-8 h-8 animate-spin text-primary" 
        />
        <p class="text-sm text-dimmed font-medium">Načítání...</p>
      </div>
      <div v-else-if="!hasMore && timelineReportIds.length > 0" class="flex flex-col items-center gap-2.5 text-dimmed">
        <UIcon name="ph:check-circle" class="size-7.5" />
        <span class="text-sm font-medium">Jste na začátku deníku.</span>
      </div>
    </div>
  </div>
</template>