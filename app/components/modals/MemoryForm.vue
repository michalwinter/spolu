<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const summaryVersion = useState<number>('memories-summary-version', () => 0)

const model = defineModel<boolean>()

const props = defineProps<{
  reportId?: string
  memoryId?: string
}>()

async function onSaved() {
  model.value = false
  summaryVersion.value += 1
}

</script>

<template>
  <UDrawer v-if="isMobile" v-model:open="model" should-scale-background :set-background-color-on-scale="false"
    :ui="{ content: 'min-h-5/6' }"
  >
    <template #content>
      <MemoryForm 
        :report-id="reportId"
        :memory-id="memoryId"
        @saved="onSaved"
      />
    </template>
  </UDrawer>

  <UModal v-else v-model:open="model" :ui="{ content: 'max-w-lg divide-y-0' }">
    <template #content>
      <MemoryForm 
        :report-id="reportId"
        :memory-id="memoryId"
        @saved="onSaved"
      />
    </template>
  </UModal>
</template>