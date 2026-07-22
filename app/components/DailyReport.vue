<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const props = defineProps<{
  reportId: string
  specific?: boolean
}>()

const { getReportById, updateDayTitle } = useMemories()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
const report = computed(() => getReportById(props.reportId))

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

const isDetailOpen = ref(false)
const memoryIndex = ref(0);

const isEditingTitle = ref(false)
const dayTitle = ref('');

watch(report, (value) => {
  dayTitle.value = value?.title || ''
}, { immediate: true })

const updateTitle = (newTitle: string) => {
  updateDayTitle(props.reportId, newTitle)
    .then((updatedReport) => {
      dayTitle.value = updatedReport.report?.title || '';
      isEditingTitle.value = false;
    })
    .catch((error) => {
      console.error('Chyba při aktualizaci názvu dne:', error);
    });
}

</script>


<template>
  <section v-if="report && report.memories.length > 1" class="flex flex-col">
    <div class="flex flex-col gap-1">
      <p v-if="!specific" class="text-sm text-highlighted font-semibold">{{ formattedDate }}</p>
      <div class="text-xl font-semibold">
        <div v-if="!isEditingTitle" class="group flex items-end gap-2.5 mb-0.5 cursor-pointer" @click="isEditingTitle = true">
          <h3 :class="!report.title ? 'italic text-dimmed' : 'text-toned'">{{ report.title || 'Přidat název dne...' }}</h3>
          <UIcon name="ph:pencil-simple-line-duotone" class="mb-0.75 hidden group-hover:block text-dimmed" />
        </div>
        <div v-else class="flex gap-1.25 items-center">
          <input v-model="dayTitle" type="text" placeholder="Název dne..." class="pb-0.5 w-full outline-none placeholder:italic border-b border-accented" autofocus />
          <UButton size="sm" icon="ph:x" color="neutral" variant="ghost" @click="() => { isEditingTitle = false; dayTitle = report?.title || '' }" />
          <UButton size="sm" icon="ph:check" color="primary" @click="() => updateTitle(dayTitle)" />
        </div>
      </div>
    </div>
    <div class="rounded-lg mt-3 flex flex-col overflow-hidden ring-2 ring-default divide-y divide-default">
      <MemoryCard
        v-for="(memory, idx) in report.memories"
        :key="memory.id"
        :report-id="report.id" :index="idx"
        @click="() => { memoryIndex = idx; isDetailOpen = true }"
      />
    </div>
  </section>
  <section v-else-if="report?.memories[0]">
    <div class="mb-3">
      <p class="text-sm text-highlighted font-semibold">{{ formattedDate }}</p>
    </div>
    <MemoryCard :report-id="report.id" @click="() => { memoryIndex = 0; isDetailOpen = true }" />
  </section>
  <UModal v-model:open="isDetailOpen" :fullscreen="isMobile">
    <template #content="{ close }">
      <MemoryDetail v-if="report" :report-id="report.id" :memory-index="memoryIndex" @close="close" />
    </template>
  </UModal>
</template>