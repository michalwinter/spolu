<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps<{
  modelValue: Date
  highlightDates?: string[] // Dny se vzpomínkami pro zobrazení tečky
}>()

const emit = defineEmits(['update:modelValue'])
const { fetchSummary } = useMemories()

const scrollContainer = ref<HTMLElement | null>(null)
const weekDays = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
const memoryDates = ref<Set<string>>(new Set())

const appConfig = useAppConfig()
const MIN_DATE = new Date(appConfig.appStartDate)
MIN_DATE.setHours(0, 0, 0, 0)
const MAX_DATE = new Date()
MAX_DATE.setHours(0, 0, 0, 0)

// Vygenerování úplně všech dnů od začátku vztahu až po dnešek
const allDays = computed(() => {
  const days = []
  let currentDate = new Date(MIN_DATE)
  
  while (currentDate <= MAX_DATE) {
    days.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return days
})

const isSelected = (date: Date) => {
  return date.toDateString() === props.modelValue.toDateString()
}

const isToday = (date: Date) => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// Helper pro bezpečné převedení na YYYY-MM-DD pro kontrolu vzpomínek z API
const toIsoDateString = (date: Date) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().split('T')[0] as string;
}

async function loadMemoryDates() {
  const dates = await fetchSummary()
  memoryDates.value = new Set(dates)
}

const hasMemory = (date: Date) => {
  return memoryDates.value.has(toIsoDateString(date))
}

const selectDate = (date: Date) => {
  emit('update:modelValue', date)
}

// Magie pro plynulé vycentrování vybraného dne
const scrollToSelected = async (mount = false) => {
  await nextTick()
  if (!scrollContainer.value) return
  
  // Najdeme DOM element, který má zrovna třídu 'is-selected'
  const activeEl = scrollContainer.value.querySelector('.is-selected') as HTMLElement
  if (activeEl) {
    // scrollIntoView nativně a plynule vycentruje element v kontejneru
    activeEl.scrollIntoView({ behavior: mount ? 'instant' : 'smooth', inline: 'center', block: 'nearest' })
  }
}

// Sledujeme změny zvenčí (když uživatel vybere den v horním kalendáři)
watch(() => props.modelValue, () => {
  scrollToSelected()
})

onMounted(async () => {
  await loadMemoryDates()
  // Zde dáme malý timeout, abychom měli jistotu, že je komponenta plně vykreslená
  // setTimeout(() => scrollToSelected(true), 50)
  scrollToSelected(true)
})
</script>

<template>
  <!-- Kontejner s plynulým horizontálním scrollem a skrytým posuvníkem -->
  <div 
    ref="scrollContainer" 
    class="flex overflow-x-auto no-scrollbar gap-2 py-2 px-5 sm:px-0 snap-x snap-mandatory items-center"
  >
    <button
      v-for="day in allDays"
      :key="day.toISOString()"
      @click="selectDate(day)"
      class="relative shrink-0 w-14 h-16 rounded-lg flex flex-col items-center justify-center snap-center transition-all duration-200 overflow-hidden"
      :class="[
        isSelected(day) 
          ? 'bg-primary text-inverted shadow-md scale-105 is-selected'
          : ('bg-muted text-toned hover:bg-accented' + (hasMemory(day) ? ' ' : '')),
      ]"
    >
      <!-- Název dne v týdnu (Po, Út...) -->
      <span class="text-[10px] uppercase tracking-wider font-medium opacity-80 mb-0.5">
        {{ weekDays[day.getDay()] }}
      </span>
      
      <!-- Číslo dne -->
      <span class="text-lg font-semibold leading-none" :class="isToday(day) && !isSelected(day) ? 'text-primary' : ''">
        {{ day.getDate() }}
      </span>

      <!-- Tečka indikující, že v tento den je uložena vzpomínka -->
      <!-- <div 
        v-if="hasMemory(day)" 
        class="absolute bottom-1.5 w-1 h-1 rounded-full transition-colors"
        :class="isSelected(day) ? 'bg-white' : 'bg-primary-500'"
      ></div> -->
      <span v-if="hasMemory(day)" class="absolute top-0 left-0 right-0 h-1 bg-primary"></span>
    </button>
  </div>
</template>

<style scoped>
/* Skrytí ošklivého nativního posuvníku */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* CSS trik pro padding, aby se první a poslední den mohl vycentrovat doprostřed obrazovky */
.px-1\/2-screen {
  padding-left: calc(50% - 28px); /* 28px je polovina šířky tlačítka (w-14 = 56px) */
  padding-right: calc(50% - 28px);
}
</style>