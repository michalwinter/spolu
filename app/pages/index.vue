<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const { daysTogether } = useRelationshipStats()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const selectedDate = useState<Date | null>('calendar-selected-date')
const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return 'Naše vzpomínky'
  return new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long', year: '2-digit' }).format(selectedDate.value);
})

const isSlideoverOpen = ref(false)

const editingMemory = ref<any | null>(null) 

watch(selectedDate, (newDate) => {
  if (newDate) {
    // Tady později zavoláš funkci, která posune tvou horizontální lištu dnů na 'newDate'
    console.log('Uživatel vybral v kalendáři datum:', newDate)
    
    // Následně sdílený stav vyčistíme, aby šlo v hlavičce znovu kliknout na stejný den
    // selectedDateFromHeader.value = null
  }
})

function openCreateForm() {
  editingMemory.value = null
  isSlideoverOpen.value = true
}

</script>

<template>
  <div class="relative h-full">
    <Transition
      enter-active-class="transition-all duration-300 ease-in-out overflow-hidden"
      enter-from-class="opacity-0 -translate-y-4 max-h-0 -mb-2.5"
      enter-to-class="opacity-100 translate-y-0 max-h-[180px] mb-6"
      leave-active-class="transition-all duration-350 ease-in-out overflow-hidden"
      leave-from-class="opacity-100 translate-y-0 max-h-[180px] mb-6"
      leave-to-class="opacity-0 -translate-y-4 max-h-0 -mb-0"
    >
      <div v-if="selectedDate">
        <div class="flex items-center justify-between my-5">
          <!-- <Transition 
            mode="out-in"
            enter-active-class="transition-opacity duration-200 ease-in-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200 ease-in-out"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          > -->
          <!-- </Transition> -->
          <h1 :key="selectedDateLabel" class="text-xl font-semibold">{{ selectedDateLabel }}</h1>
          <UButton icon="ph:arrow-u-up-left" color="neutral" variant="soft" label="Zpět" @click="() => { selectedDate = null }" />
        </div>

        <div class="-mx-5 sm:mx-0">
          <HorizontalDateBar 
            v-model="selectedDate" 
            :highlight-dates="[]" 
          />
        </div>
      </div>
    </Transition>

    <Timeline v-if="!selectedDate" />
    
    <!-- Plovoucí FAB (Floating Action Button) tlačítko pro mobily -->
    <UButton 
      icon="ph:plus-bold" 
      color="primary" 
      size="xl" 
      variant="solid" 
      :ui="{ base: 'rounded-full' }" 
      class="fixed bottom-6 right-5 z-40 w-14 h-14 flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
      @click="openCreateForm"
    />
    
    <!-- Výsuvný panel zprava (Slideover) pro vytvoření/úpravu vzpomínky na mobile -->
    <ModalsMemoryForm v-model="isSlideoverOpen" />
  </div>
</template>