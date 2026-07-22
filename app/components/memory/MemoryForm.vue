<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { CalendarDate, type DateValue, DateFormatter, getLocalTimeZone, today, Time } from '@internationalized/date'

const props = defineProps<{
  reportId?: string
  memoryId?: string
}>()

const emit = defineEmits<{
  saved: []
}>()


const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
const selectedDate = useState<Date | null>('calendar-selected-date', () => null)

const { getReportById, createMemory, markSummaryChanged, updateMemory } = useMemories()
const report = computed(() => props.reportId ? getReportById(props.reportId) : null)

const tz = getLocalTimeZone()
const df = new DateFormatter('cs-CZ', { dateStyle: 'long' })

const dateValue = shallowRef<DateValue>(today(tz))
const enableTimeInput = ref(false)
const timeValue = shallowRef(new Time(new Date().getHours(), new Date().getMinutes()))
const text = ref('')
const location = ref('')
const lat = ref<number | undefined>(undefined)
const lng = ref<number | undefined>(undefined)
const newPhotos = shallowRef<File[] | null>(null)
const tags = ref<string[]>([])
const existingPhotos = ref<MemoryPhoto[]>([])
const removedPhotoIds = ref<string[]>([])

const loading = ref(false)
const errorMessage = ref('')

function getErrorMessage(error: unknown): string | null {
  const candidate = error as any

  return candidate?.data?.message
    || candidate?.response?._data?.message
    || candidate?.statusMessage
    || candidate?.message
    || null
}

function resetForm() {
  if (report.value && props.memoryId) {
    const memory = report.value.memories.find(m => m.id === props.memoryId)
    if (memory) {
      const d = new Date(report.value.date)
      const [hours, minutes] = memory.time?.split(':').map(value => Number.parseInt(value, 10)) ?? [d.getHours(), d.getMinutes()]
      dateValue.value = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
      timeValue.value = new Time(Number.isFinite(hours) ? hours : d.getHours(), Number.isFinite(minutes) ? minutes : d.getMinutes())
      enableTimeInput.value = !!memory.time
      text.value = memory.text
      location.value = memory.location ?? ''
      lat.value = memory.lat
      lng.value = memory.lng
      tags.value = [...memory.tags]
      existingPhotos.value = [...memory.photos]
    }
  } else {
    const baseDate = selectedDate.value ? new Date(selectedDate.value) : new Date()
    dateValue.value = new CalendarDate(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate())
    timeValue.value = new Time(baseDate.getHours(), baseDate.getMinutes())
    enableTimeInput.value = false
    text.value = ''
    location.value = ''
    lat.value = undefined
    lng.value = undefined
    tags.value = []
    existingPhotos.value = []
  }
  newPhotos.value = null
  removedPhotoIds.value = []
  errorMessage.value = ''
}

function removeExistingPhoto(photoId: string) {
  existingPhotos.value = existingPhotos.value.filter(p => p.id !== photoId)
  removedPhotoIds.value.push(photoId)
}

function onLocationTextChanged(value: string) {
  location.value = value
}

function onLocationChanged(value: { lat?: number, lng?: number }) {
  lat.value = value.lat
  lng.value = value.lng
}

async function onSubmit() {
  if (!text.value.trim()) {
    errorMessage.value = 'Napiš prosím nějaký text.'
    return
  }

  const hours = timeValue.value.hour
  const minutes = timeValue.value.minute
  const combinedDate = new Date(dateValue.value.year, dateValue.value.month - 1, dateValue.value.day, hours, minutes)
  const normalizedTags = tags.value
    .map(tag => tag.trim())
    .filter(Boolean)

  loading.value = true
  errorMessage.value = ''

  try {
    const payload: MemoryFormPayload = {
      date: combinedDate,
      time: enableTimeInput.value
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        : undefined,
      text: text.value.trim(),
      location: location.value.trim(),
      lat: lat.value,
      lng: lng.value,
      tags: normalizedTags,
      photos: newPhotos.value ?? [],
      removePhotoIds: removedPhotoIds.value
    }

    if (props.reportId && props.memoryId) {
      await updateMemory(props.reportId, props.memoryId, payload)
    } else {
      await createMemory(payload)
    }

    emit('saved')
  } catch (error) {
    console.error('[memory-form] Nepodařilo se uložit vzpomínku', error)
    errorMessage.value = getErrorMessage(error) || 'Nepodařilo se uložit vzpomínku.'
  } finally {
    loading.value = false
    markSummaryChanged()
  }
}

watch(
  () => [props.reportId, props.memoryId, report.value?.updatedAt] as const,
  () => resetForm(),
  { immediate: true }
)
</script>

<template>
  <div class="p-5 flex flex-col">
    <div class="mb-5 flex items-center gap-2">
      <UIcon name="ph:note-duotone" class="text-primary text-2xl" />
      <h2 class="flex-1 text-lg font-semibold">Nová vzpomínka</h2>
      <UButton :label="reportId && memoryId ? 'Uložit' : 'Přidat'" color="primary" :loading="loading" :disabled="!text.trim()" @click="onSubmit" />
    </div>

    <UTheme :props="{
      button: { size: 'lg' },
      input: { size: 'lg' },
      inputTime: { size: 'lg' },
      inputTags: { size: 'lg' },
      textarea: { size: 'lg', variant: 'none', ui: { base: 'p-0' } }
    }">
      <div class="flex flex-col gap-2.5">
        <UTextarea v-model="text" :rows="5" placeholder="Co se dělo, co jste zažili, kde jste byli..." class="mb-2.5 w-full" autoresize />
        <UFormField label="Fotky">
          <MemoryImageUploadGrid v-model="newPhotos" :existing="existingPhotos" @remove-existing="removeExistingPhoto" />
        </UFormField>
        <div class="flex gap-5">
          <UFormField label="Datum" class="flex-1">
            <UModal :ui="{ content: 'max-w-2xs' }">
            <!-- <UPopover :content="{ align: 'start' }"> -->
              <UButton color="neutral" variant="outline" block>
                {{ df.format(dateValue.toDate(tz)) }}
              </UButton>
              <template #content="{ close }">
                <UCalendar v-model="dateValue" @update:model-value="close" class="p-2.5" />
              </template>
            <!-- </UPopover> -->
            </UModal>
          </UFormField>
          <UFormField label="Čas" class="w-1/3">
            <UButton v-if="!enableTimeInput" label="Přidat čas" 
              variant="outline" color="neutral" block
              @click="() => { enableTimeInput = true }"
              class="opacity-60" 
            />
            <UInputTime v-else v-model="timeValue" class="w-full" :ui="{ base: 'justify-center' }" />
  
            <template #hint>
              <USwitch v-model="enableTimeInput" size="xs" />
            </template>
          </UFormField>
        </div>
        <UFormField label="Lokace">
          <div class="flex items-center gap-2.5">
            <UInput v-model="location" icon="ph:map-pin" class="w-full" />
            <UModal :fullscreen="isMobile" :ui="{ content: 'max-w-xl' }">
              <UButton icon="ph:map-trifold" variant="subtle" :color="lat && lng ? 'primary' : 'neutral'" />

              <template #content="{ close }">
                <LocationPicker :text="location" :location="{ lat, lng }" @update:text="onLocationTextChanged" @update:location="onLocationChanged" @close="close" />
              </template>
            </UModal>
          </div>
        </UFormField>
        <UFormField label="Štítky">
          <UInputTags v-model="tags" icon="ph:tag" class="w-full" />
        </UFormField>
      </div>
    </UTheme>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />
  </div>
</template>