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

const PREVIEW_SIZE = 320

type Preview = { id: number, file: File, url: string | null }

const inputRef = ref<HTMLInputElement | null>(null)
const previews = shallowRef<Preview[]>([])
const previewCache = new Map<File, Preview>()
let nextPreviewId = 0

/** Shrinks the photo so the grid does not have to decode full-size originals. */
async function createThumbnailUrl(file: File) {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: PREVIEW_SIZE, resizeQuality: 'medium', imageOrientation: 'from-image' })
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
    if (blob) {
      return URL.createObjectURL(blob)
    }
  } catch {
    // Falls back to the original below.
  }

  return URL.createObjectURL(file)
}

function syncPreviews(files: File[]) {
  const current = new Set(files)

  for (const [file, preview] of previewCache) {
    if (!current.has(file)) {
      if (preview.url) {
        URL.revokeObjectURL(preview.url)
      }
      previewCache.delete(file)
    }
  }

  for (const file of files) {
    if (previewCache.has(file)) {
      continue
    }

    const preview: Preview = { id: nextPreviewId++, file, url: null }
    previewCache.set(file, preview)

    void createThumbnailUrl(file).then((url) => {
      if (!previewCache.has(file)) {
        URL.revokeObjectURL(url)
        return
      }

      preview.url = url
      previews.value = [...previews.value]
    })
  }

  previews.value = files.map(file => previewCache.get(file)!)
}

watch(() => model.value ?? [], files => syncPreviews(files), { immediate: true })

onUnmounted(() => {
  for (const preview of previewCache.values()) {
    if (preview.url) {
      URL.revokeObjectURL(preview.url)
    }
  }
  previewCache.clear()
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
        v-for="(preview, index) in previews"
        :key="preview.id"
        class="relative aspect-square group rounded-lg overflow-hidden bg-elevated"
      >
        <img v-if="preview.url" :src="preview.url" alt="Nahraný obrázek" decoding="async" class="size-full object-cover">
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