<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'

const appConfig = useAppConfig()
const { fetchSummary } = useMemories()

const model = defineModel<Date | null>()

const scrollContainer = ref<HTMLElement | null>(null)

// Názvy dnů v týdnu pro hlavičku (začínáme pondělím)
const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

const MIN_DATE = new Date(appConfig.appStartDate)
MIN_DATE.setHours(0, 0, 0, 0)

const MAX_DATE = new Date() // Dnešek
MAX_DATE.setHours(0, 0, 0, 0)

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const currentMonthId = computed(() => {
  const today = new Date()
  return `${today.getFullYear()}-${today.getMonth()}`
})

// Generování kalendářních dat
const generateMonths = () => {
  const monthsData = []
  
  const startYear = MIN_DATE.getFullYear()
  const startMonth = MIN_DATE.getMonth()
  const endYear = MAX_DATE.getFullYear()
  const endMonth = MAX_DATE.getMonth()
  
  // Výpočet přesného počtu měsíců
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth)
  
  // Smyčka jde od nejstaršího (nahoře) po nejnovější (dole)
  for (let i = 0; i <= totalMonths; i++) {
    const targetDate = new Date(startYear, startMonth + i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    // Zjištění počtu dnů v měsíci
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Zjištění, kterým dnem měsíc začíná (0 = Neděle, 1 = Pondělí...)
    const firstDayIndex = new Date(year, month, 1).getDay()
    // Přepočet na evropský týden (Pondělí = 0, Neděle = 6)
    const startOffset = 
      month === MIN_DATE.getMonth() && year === MIN_DATE.getFullYear()
        ? (MIN_DATE.getDay() === 0 ? 6 : MIN_DATE.getDay() - 1) // Pokud je to první měsíc, začínáme od dnešního dne
      : firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const days = []
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      currentDate.setHours(0, 0, 0, 0)
      
      // Den je validní pouze pokud spadá mezi počáteční a koncový bod
      const isValid = currentDate >= MIN_DATE && currentDate <= MAX_DATE

      days.push({
        number: day,
        date: currentDate,
        isValid
      })
    }

    const label = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(targetDate)
    
    monthsData.push({
      id: `${year}-${month}`,
      label,

      startOffset,
      days
    })
  }
  return monthsData
}

const months = computed(() => generateMonths())

// Kontrola, zda je den vybraný
const isSelected = (date: Date) => {
  if (!model.value) return false
  return date.toDateString() === model.value.toDateString()
}

// Kontrola pro zvýraznění dneška
const isToday = (date: Date) => {
  return date.toDateString() === new Date().toDateString()
}

const selectDate = (date: Date) => {
  model.value = date
}

const memoryDates = ref<Set<string>>(new Set())

async function loadMemoryDates() {
  const dates = await fetchSummary()
  memoryDates.value = new Set(dates)
}

const hasMemory = (date: Date) => {
  return memoryDates.value.has(toDayKey(date))
}

onMounted(async () => {
  await loadMemoryDates()
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
})
</script>

<template>
  <div 
    ref="scrollContainer" 
    class="h-[70vh] overflow-y-auto overflow-x-hidden flex flex-col pr-4 pb-16"
  >
    <div v-for="month in months" :key="month.id" class="flex flex-row">
      <div class="mr-2.5 flex flex-col items-center">
        <div class="size-7 flex items-center justify-center">
          <span class="size-2.5 rounded-full" :class="month.id === currentMonthId ? 'bg-primary' : 'bg-accented'"></span>
        </div>
        <div class="flex-1 w-px" :class="month.id === currentMonthId ? 'bg-primary' : 'bg-elevated dark:bg-muted'"></div>
      </div>
      <div class="flex-1 mb-8">
        <h3 class="mb-3 text-lg font-semibold capitalize">{{ month.label }}</h3>
        
        <!-- Hlavička se dny v týdnu -->
        <div class="mb-2.5 grid grid-cols-7 gap-2.5 text-center text-xs text-muted font-medium uppercase">
          <div v-for="day in weekDays" :key="day">{{ day }}</div>
        </div>
        
        <!-- Mřížka dnů -->
        <div class="grid grid-cols-7 gap-2.5">
          <!-- Prázdná místa pro odsazení prvního dne v měsíci -->
          <div v-for="n in month.startOffset" :key="'empty-'+n"></div>
          <template v-for="day in month.days" :key="day.date.toISOString()">
            
            <!-- <UButton 
              v-if="day.isValid"
              @click="selectDate(day.date)" 
              class="aspect-square"
              block
              :color="!isSelected(day.date) && !isToday(day.date) ? 'neutral' : 'primary'"
              :variant="isSelected(day.date) ? 'solid' : 'ghost'"
              :label="day.number.toString()"
              :autofocus="isToday(day.date)"
            /> -->
            <button v-if="day.isValid" @click="selectDate(day.date)"
              :class="[ 'relative',
                'aspect-square rounded-lg flex items-center justify-center transition-colors text-default',
                isSelected(day.date) ? 'bg-primary text-inverted' : 
                  (isToday(day.date) ? ('hover:bg-primary/10 text-primary' + 
                    (hasMemory(day.date) ? ' bg-primary/10' : ''))
                  : (hasMemory(day.date) ? 'border-2 border-dashed border-primary/25 text-primary bg-primary/10 hover:bg-primary/20' : 'hover:bg-elevated')
                  ),
              ]"
            >
              <span class="z-30 text-sm">{{ day.number }}</span>
              <!-- <span
                v-if="hasMemory(day.date)"
                class="absolute size-1.5 rounded-full bg-primary left-1/2 -translate-x-1/2 bottom-1"
              ></span> -->
              <!-- <UIcon name="ph:heart-duotone" class="absolute rotate-45 top-px right-0 size-4 text-primary pointer-events-none" /> -->
              <!-- <UIcon name="ph:heart" class="absolute left-1/2 top-1/2 size-7.5 -translate-x-1/2 -translate-y-1/2 text-primary pointer-events-none" /> -->
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Skrytí scrollbaru pro "App-like" vzhled -->
<style scoped>
div::-webkit-scrollbar {
  display: none;
}
div {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>