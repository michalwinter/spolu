<script setup lang="ts">
const props = defineProps<{
  selectedDate?: Date | null
}>()

const emit = defineEmits<{
  edit: [memory: Memory]
  changed: []
  clearFilter: []
}>()

const { fetchLatestPage, fetchByRange } = useMemories()

const items = ref<Memory[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const errorMessage = ref('')

const activeMemory = ref<Memory | null>(null)
const detailOpen = ref(false)

async function loadFeed() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await fetchLatestPage()
    items.value = page.items
    hasMore.value = page.hasMore
  } catch {
    errorMessage.value = 'Nepodařilo se načíst vzpomínky.'
  } finally {
    loading.value = false
  }
}

async function loadEarlier() {
  if (!items.value.length || loadingMore.value) {
    return
  }
  loadingMore.value = true
  try {
    const oldest = items.value[0]
    const page = await fetchLatestPage(oldest.date)
    items.value = [...page.items, ...items.value]
    hasMore.value = page.hasMore
  } catch {
    errorMessage.value = 'Nepodařilo se načíst starší vzpomínky.'
  } finally {
    loadingMore.value = false
  }
}

async function loadForDate(date: Date) {
  loading.value = true
  errorMessage.value = ''
  try {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    const page = await fetchByRange(start.toISOString(), end.toISOString())
    items.value = page.items
    hasMore.value = false
  } catch {
    errorMessage.value = 'Nepodařilo se načíst vzpomínky pro vybrané datum.'
  } finally {
    loading.value = false
  }
}

function openDetail(memory: Memory) {
  activeMemory.value = memory
  detailOpen.value = true
}

function handleEdit(memory: Memory) {
  detailOpen.value = false
  emit('edit', memory)
}

function handleDeleted(id: string) {
  items.value = items.value.filter(item => item.id !== id)
  detailOpen.value = false
  emit('changed')
}

async function refresh() {
  if (props.selectedDate) {
    await loadForDate(props.selectedDate)
  } else {
    await loadFeed()
  }
}

watch(() => props.selectedDate, (date) => {
  if (date) {
    loadForDate(date)
  } else {
    loadFeed()
  }
}, { immediate: true })

defineExpose({ refresh })
</script>

<template>
  <div>
    <div v-if="selectedDate" class="flex items-center justify-between mb-3">
      <p class="text-sm text-muted">
        Vzpomínky z {{ selectedDate.toLocaleDateString('cs-CZ') }}
      </p>
      <UButton label="Zobrazit vše" size="xs" color="neutral" variant="ghost" @click="emit('clearFilter')" />
    </div>

    <div v-else-if="hasMore" class="flex justify-center mb-4">
      <UButton
        label="Načíst starší vzpomínky"
        color="neutral"
        variant="outline"
        size="sm"
        :loading="loadingMore"
        @click="loadEarlier"
      />
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-6 text-muted" />
    </div>

    <div v-else-if="!items.length" class="text-center py-12 text-muted">
      <UIcon name="i-lucide-image-off" class="size-8 mx-auto mb-2" />
      <p>Zatím žádné vzpomínky.</p>
    </div>

    <div v-else class="space-y-4">
      <MemoryCard
        v-for="item in items"
        :key="item.id"
        :memory="item"
        @click="openDetail(item)"
      />
    </div>

    <MemoryDetailModal
      v-model:open="detailOpen"
      :memory="activeMemory"
      @edit="handleEdit"
      @deleted="handleDeleted"
    />
  </div>
</template>
