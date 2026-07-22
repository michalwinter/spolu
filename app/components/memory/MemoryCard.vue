<script setup lang="ts">
const props = defineProps<{
  reportId: string
  index?: number
}>()

const { getReportById } = useMemories()
const report = computed(() => getReportById(props.reportId))
const memory = computed(() => report.value?.memories[props.index ?? 0])
const multiple = computed(() => (report.value?.memories.length ?? 0) > 1)
const position = computed(() => {
  if (props.index === undefined) {
    return 'single'
  }
  if (props.index === 0) {
    return 'first'
  }
  if (props.index === (report.value?.memories.length ?? 1) - 1) {
    return 'last'
  }
  return 'middle'
})

const formattedDate = computed(() => {
  if (!report.value) {
    return ''
  }

  const date = new Date(report.value.date)
  return date.toLocaleString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const maxPhotos = 3;
const visiblePhotos = computed(() => memory.value?.photos?.slice(0, maxPhotos) ?? [])
const extraPhotoCount = computed(() => Math.max((memory.value?.photos?.length ?? 0) - maxPhotos, 0))
</script>

<template>
  <div v-if="memory"
    :class="[
      'flex flex-col gap-2.5',
      'p-3.75 sm:p-5 cursor-pointer hover:bg-muted dark:hover:bg-muted/25 transition',
      position === 'single' ? 'rounded-lg ring-2 ring-default' : '',
    ]"
  >
    <!-- <div v-if="memory.time" class="flex items-center gap-1.5 text-sm text-highlighted font-semibold">
      
      <p>{{ memory.time }}</p>
    </div> -->

    <div class="flex items-center gap-2.5">
      <!-- <UBadge v-if="memory.time" variant="soft" color="neutral" :label="memory.time" /> -->
      <p v-if="memory.time" class="text-sm text-highlighted font-semibold">{{ memory.time }}</p>
      <UBadge v-if="memory.location" variant="soft" icon="ph:map-pin" :label="memory.location" />
    </div>

    <p class="mb-5 text-sm text-default line-clamp-3 whitespace-pre-line">
      {{ memory.text }}
    </p>

    <div class="grid grid-cols-4 gap-2.5">
      <div class="flex-1 col-span-3 grid grid-cols-3 sm:flex gap-2.5">
        <div
          v-for="(photo, index) in visiblePhotos"
          :key="photo.id ?? photo.filename"
          class="relative aspect-square sm:size-20 rounded-md overflow-hidden bg-elevated"
        >
          <img :src="photoUrl(photo.thumbnailFilename)" class="size-full object-cover" loading="lazy" alt="">
          <div
            v-if="index === visiblePhotos.length - 1 && extraPhotoCount > 0"
            class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-medium"
          >
            +{{ extraPhotoCount }}
          </div>
        </div>
      </div>
      <div class="flex items-end justify-end">
        <UBadge v-if="memory.author" variant="soft" color="neutral" size="sm" class="ml-auto"
          :label="memory.author.name || memory.author.username"
        />
      </div>
    </div>
  </div>
</template>
