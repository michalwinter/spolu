<script setup lang="ts">
const props = defineProps<{
  photos: MemoryPhoto[]
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [number | null]
}>()

const isOpen = computed({
  get: () => props.modelValue !== null,
  set: (value: boolean) => {
    if (!value) {
      emit('update:modelValue', null)
    }
  }
})

const currentPhoto = computed(() => {
  if (props.modelValue === null) {
    return null
  }
  return props.photos[props.modelValue] ?? null
})

function go(delta: number) {
  if (props.modelValue === null || !props.photos.length) {
    return
  }
  const next = (props.modelValue + delta + props.photos.length) % props.photos.length
  emit('update:modelValue', next)
}

function onKeydown(event: KeyboardEvent) {
  if (props.modelValue === null) {
    return
  }
  if (event.key === 'ArrowRight') {
    go(1)
  } else if (event.key === 'ArrowLeft') {
    go(-1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <UModal v-model:open="isOpen" fullscreen :ui="{ content: 'bg-black/95' }">
    <template #content>
      <div class="relative w-full h-full flex items-center justify-center">
        <img
          v-if="currentPhoto"
          :src="photoUrl(currentPhoto.filename)"
          class="max-w-full max-h-full object-contain"
          alt=""
        >

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="lg"
          class="absolute top-4 right-4 text-white hover:bg-white/10"
          aria-label="Zavřít"
          @click="emit('update:modelValue', null)"
        />

        <template v-if="photos.length > 1">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xl"
            class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            aria-label="Předchozí fotka"
            @click="go(-1)"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="xl"
            class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
            aria-label="Další fotka"
            @click="go(1)"
          />

          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-2 py-1 rounded-md">
            {{ (modelValue ?? 0) + 1 }} / {{ photos.length }}
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
