<script setup lang="ts">
const model = defineModel<File[] | null>({
  default: null
})

const props = defineProps<{
  existing?: MemoryPhoto[]
}>()

const emit = defineEmits<{
  'remove-existing': [id: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const previewUrls = computed(() => {
  const files = model.value ?? []
  return files.map(file => URL.createObjectURL(file))
})

function cleanupPreviewUrls() {
  for (const url of previewUrls.value) {
    URL.revokeObjectURL(url)
  }
}

// watch(
//   () => model.value ?? [],
//   (files) => {
//     cleanupPreviewUrls()
//     previewUrls.value = files.map(file => URL.createObjectURL(file))
//   },
//   { immediate: true }
// )

onUnmounted(() => {
  cleanupPreviewUrls()
})

function openPicker() {
  inputRef.value?.click()
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const pickedFiles = Array.from(target.files ?? [])

  if (!pickedFiles.length) {
    return
  }

  const currentFiles = model.value ?? []
  model.value = [...currentFiles, ...pickedFiles]

  target.value = ''
}

function removeFile(index: number) {
  const currentFiles = model.value ?? []
  model.value = currentFiles.filter((_, itemIndex) => itemIndex !== index)

  if (!model.value.length) {
    model.value = null
  }
}
</script>

<template>
  <div>
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFileChange"
    >

    <div class="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
      <div v-for="(photo, index) in existing" :key="photo.id" class="relative aspect-square group rounded-lg overflow-hidden">
        <img :src="photoUrl(photo.thumbnailFilename)" alt="Existující obrázek" class="size-full object-cover">
        <UButton
          icon="ph:x"
          size="xs"
          color="neutral"
          variant="solid"
          class="absolute top-1 right-1 rounded-full z-20"
          @click="() => emit('remove-existing', photo.id)"
        />
      </div>
      <div
        v-for="(previewUrl, index) in previewUrls"
        :key="previewUrl"
        class="relative aspect-square group rounded-lg overflow-hidden"
      >
        <img :src="previewUrl" alt="Nahraný obrázek" class="size-full object-cover">
        <!-- <div class="absolute inset-0 bg-black/30 z-10"></div> -->
        <UButton
          icon="ph:x"
          size="xs"
          color="neutral"
          variant="solid"
          class="absolute top-1 right-1 rounded-full z-20"
          @click="removeFile(index)"
        />
      </div>

      <button
        class="aspect-square rounded-lg border-2 border-dashed border-accented hover:border-error/60 text-dimmed hover:text-error hover:bg-error/5 transition-colors flex items-center justify-center"
        @click="openPicker"
      >
        <UIcon name="ph:camera-plus" class="text-2xl" />
      </button>
    </div>
  </div>
</template>