<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const summaryVersion = useState<number>('memories-summary-version', () => 0)

const model = defineModel<boolean>()

const props = defineProps<{
  reportId?: string
  memoryId?: string
  resumeDraft?: boolean
}>()

const formRef = ref<{ isDirty: boolean, flushDraftSave: () => Promise<void> } | null>(null)
const isDiscardConfirmOpen = ref(false)
const toast = useToast()

async function onSaved() {
  model.value = false
  summaryVersion.value += 1
}

async function onOpenChange(open: boolean) {
  if (!open) {
    if (props.memoryId && formRef.value?.isDirty) {
      isDiscardConfirmOpen.value = true
      return
    }

    try {
      await formRef.value?.flushDraftSave()
    } catch (error) {
      console.error('[memory-modal] Nepodařilo se uložit koncept před zavřením', error)
      toast.add({ title: 'Koncept se nepodařilo uložit. Zkuste to prosím znovu.', color: 'error' })
      return
    }
  }
  model.value = open
}

function discard() {
  isDiscardConfirmOpen.value = false
  model.value = false
}

</script>

<template>
  <UDrawer v-if="isMobile" :open="model" @update:open="onOpenChange" handle-only should-scale-background :set-background-color-on-scale="false"
    :ui="{ content: 'min-h-5/6' }"
  >
    <template #content>
      <MemoryForm 
        v-if="model"
        ref="formRef"
        :report-id="reportId"
        :memory-id="memoryId"
        :resume-draft="resumeDraft"
        @saved="onSaved"
      />
    </template>
  </UDrawer>

  <UModal v-else :open="model" @update:open="onOpenChange" :ui="{ content: 'max-w-lg divide-y-0' }">
    <template #content>
      <MemoryForm 
        v-if="model"
        ref="formRef"
        :report-id="reportId"
        :memory-id="memoryId"
        :resume-draft="resumeDraft"
        @saved="onSaved"
      />
    </template>
  </UModal>

  <UModal v-model:open="isDiscardConfirmOpen" title="Zahodit změny?" description="Máš neuložené změny. Opravdu je chceš zahodit?" :ui="{ content: 'max-w-sm' }" :close="false">
    <template #footer>
      <div class="flex w-full justify-end gap-2.5">
        <UButton label="Pokračovat v úpravách" color="neutral" variant="ghost" @click="() => { isDiscardConfirmOpen = false }" />
        <UButton label="Zahodit" color="error" @click="discard" />
      </div>
    </template>
  </UModal>
</template>