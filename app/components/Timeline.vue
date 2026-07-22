<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

const limit = 5 // Počet dnů na jedno načtení
const hasMore = ref(true)
const pending = ref(false)
const bottomObserver = ref<HTMLElement | null>(null)
const {
  timelineReportIds,
  getReportById,
  replaceTimelineReports,
  appendTimelineReports,
} = useMemories()

// 1. Prvotní SSR načtení (bez parametru before = načte nejnovější)
const { data, error } = await useFetch<MemoriesGetResponse>('/api/memories', {
  query: { limit }
})

if (data.value) {
  if (!timelineReportIds.value.length) {
    replaceTimelineReports(data.value.items)
  }
  hasMore.value = data.value.hasMore
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
    
    const res = await $fetch<MemoriesGetResponse>('/api/memories', {
      query: { 
        limit,
        before: lastReport.date // Musí to být ISO string, což tvůj serializeDailyReport pravděpodobně dělá
      }
    })

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