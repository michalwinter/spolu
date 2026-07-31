<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
// 1. Importujeme správný typ
import type { CalendarDate } from '@internationalized/date'

const { user, clear } = useUserSession()
const isSettingsOpen = ref(false)
const { public: { appVersion, appBuild } } = useRuntimeConfig()
const versionLabel = computed(() => appBuild ? `v${appVersion} (${appBuild})` : `v${appVersion}`)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const selectedDate = useState<Date | null>('calendar-selected-date', () => null)
const isCalendarOpen = ref(false)

watch(selectedDate, (newVal) => {
  if (newVal) {
    isCalendarOpen.value = false
  }
})
</script>

<template>
  <div class="relative h-full bg-default scrollbar-none">
    <ClientOnly>
      <ReleaseNotesChecker />
    </ClientOnly>
    <header class="sticky top-0 z-10 bg-default border-b border-muted">
      <UContainer class="flex items-center justify-between py-3.75">
        <div class="flex items-center gap-2">
          <UIcon name="ph:heart-duotone" class="text-primary size-6" />
          <span class="font-semibold text-lg block">Spolu</span>
        </div>

        <div v-if="user" class="flex items-center gap-2.5">
          <UButton 
            icon="ph:calendar" :ui="{ leadingIcon: 'size-5.5' }"
            :color="selectedDate ? 'primary' : 'neutral'"
            :variant="selectedDate ? 'soft' : 'ghost'"
            @click="() => { isCalendarOpen = true }"
          />
          <UModal v-if="!isMobile" v-model:open="isCalendarOpen" :fullscreen="isMobile" :ui="{ content: 'max-w-md divide-y-0', body: 'pt-0 sm:pt-0' }">
            <template #body>
              <ScrollCalendar v-model="selectedDate" />
            </template>
          </UModal>
          <UDrawer v-else v-model:open="isCalendarOpen" should-scale-background :set-background-color-on-scale="false"
            :ui="{ body: 'min-h-96' }" handle-only
          >
            <template #body>
              <ScrollCalendar v-model="selectedDate" />
            </template>
          </UDrawer>
          
          <UButton icon="ph:gear-six" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }" @click="() => { isSettingsOpen = true }" />

          <UDrawer v-if="isMobile" v-model:open="isSettingsOpen" should-scale-background :set-background-color-on-scale="false"
            :ui="{ content: 'min-h-[70vh]' }">
            <template #content>
              <UserSettings />
            </template>
          </UDrawer>
          <UModal v-else v-model:open="isSettingsOpen" side="right" :ui="{ content: 'max-w-md min-h-[50vh]' }" >
            <template #content>
              <UserSettings />
            </template>
          </UModal>
          
          <SidePanel />
        </div>
      </UContainer>
    </header>

    <UContainer class="pb-8">
      <slot />
    </UContainer>
  </div>
</template>