<script setup lang="ts" generic="T extends { filename: string, author: SerializedAuthor }">
import type { SerializedAuthor } from '~~/shared/types'

const props = defineProps<{
  photos: T[]
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

watch(
  () => props.photos,
  () => {
    emit('update:modelValue', props.photos.length > 0 ? 0 : null)
  }
)

function getPhotoAt(index: number) {
  return props.photos[index] ?? null
}

const dragOffsetX = ref(0)
const isDragging = ref(false)
const isTransitioning = ref(false)
const dragStartX = ref<number | null>(null)
const dragStartY = ref<number | null>(null)
const pendingDirection = ref<1 | -1 | null>(null)
const SWIPE_THRESHOLD = 48

const slidePhotos = computed(() => {
  if (props.modelValue === null || !props.photos.length) {
    return [] as T[]
  }

  if (props.photos.length === 1) {
    return [getPhotoAt(props.modelValue)].filter((photo): photo is T => photo !== null)
  }

  const current = props.modelValue
  const previous = (current - 1 + props.photos.length) % props.photos.length
  const next = (current + 1) % props.photos.length

  return [getPhotoAt(previous), getPhotoAt(current), getPhotoAt(next)].filter((photo): photo is T => photo !== null)
})

const trackStyle = computed(() => ({
  transform: `translateX(calc(${slidePhotos.value.length > 1 ? '-100%' : '0%'} + ${dragOffsetX.value}px))`
}))

function go(delta: number) {
  if (props.modelValue === null || !props.photos.length) {
    return
  }
  const next = (props.modelValue + delta + props.photos.length) % props.photos.length
  emit('update:modelValue', next)
}

function animateGo(delta: number) {
  if (props.modelValue === null || props.photos.length < 2 || isTransitioning.value) {
    return
  }

  const direction = delta > 0 ? 1 : -1

  isDragging.value = false
  isTransitioning.value = true
  pendingDirection.value = direction
  dragStartX.value = null
  dragStartY.value = null
  dragOffsetX.value = -(window.innerWidth || 1) * direction
}

defineShortcuts({
  arrowleft: () => animateGo(-1),
  arrowright: () => animateGo(1),
})

function beginDrag(startX: number, startY: number) {
  if (props.modelValue === null || props.photos.length < 2) {
    return
  }

  isDragging.value = true
  isTransitioning.value = false
  pendingDirection.value = null
  dragStartX.value = startX
  dragStartY.value = startY
  dragOffsetX.value = 0
}

function updateDrag(currentX: number, currentY: number) {
  if (!isDragging.value || dragStartX.value === null || dragStartY.value === null) {
    return
  }

  const deltaX = currentX - dragStartX.value
  const deltaY = currentY - dragStartY.value

  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
    cancelDrag()
    return
  }

  dragOffsetX.value = deltaX
}

function cancelDrag() {
  isDragging.value = false
  isTransitioning.value = true
  pendingDirection.value = null
  dragOffsetX.value = 0
  dragStartX.value = null
  dragStartY.value = null
}

function finishDrag() {
  if (!isDragging.value || dragStartX.value === null || dragStartY.value === null) {
    return
  }

  const width = window.innerWidth || 1
  const deltaX = dragOffsetX.value
  const shouldSwipe = Math.abs(deltaX) >= Math.max(SWIPE_THRESHOLD, width * 0.18)

  isDragging.value = false
  isTransitioning.value = true
  dragStartX.value = null
  dragStartY.value = null

  if (shouldSwipe) {
    const direction = deltaX < 0 ? 1 : -1
    pendingDirection.value = direction
    dragOffsetX.value = -direction * width
    return
  }

  pendingDirection.value = null
  dragOffsetX.value = 0
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  beginDrag(event.clientX, event.clientY)

  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent) {
  updateDrag(event.clientX, event.clientY)
}

function onPointerUp() {
  finishDrag()
}

function onPointerCancel() {
  cancelDrag()
}

function onTrackTransitionEnd() {
  if (pendingDirection.value !== null) {
    go(pendingDirection.value)
  }

  pendingDirection.value = null
  isTransitioning.value = false
  dragOffsetX.value = 0
}
</script>

<template>
  <UModal v-model:open="isOpen" fullscreen :ui="{ content: 'bg-black/95' }">
    <template #content>
      <UTheme 
        :props="{
          button: {
            variant: 'ghost',
            color: 'neutral',
            size: 'lg',
          }
        }" 
        :ui="{
          button: {
            base: 'text-white hover:bg-white/10 active:bg-white/10'
          }
        }"
      >
        <div
          class="relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-pan-y"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <div
            v-if="currentPhoto != null"
            class="absolute inset-0 flex h-full w-full"
            :class="{ 'transition-transform duration-300 ease-out': isTransitioning && !isDragging }"
            :style="trackStyle"
            @transitionend="onTrackTransitionEnd"
          >
            <div
              v-for="(slidePhoto, slideIndex) in slidePhotos"
              :key="`${slidePhoto.filename}-${slideIndex}`"
              class="h-full w-full shrink-0 flex items-center justify-center"
            >
              <img
                :src="photoUrl(slidePhoto.filename)"
                class="max-w-full max-h-full object-contain"
                alt=""
              >
            </div>
          </div>
  
          <UButton
            icon="ph:x"
            class="absolute top-4 right-4"
            aria-label="Zavřít"
            @pointerdown.stop
            @click="emit('update:modelValue', null)"
          />
  
          <template v-if="photos.length > 1">
            <UButton
              icon="ph:caret-left"
              class="hidden sm:inline-flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2"
              aria-label="Předchozí fotka"
              @pointerdown.stop
              @click="animateGo(-1)"
            />
            <UButton
              icon="ph:caret-right"
              class="hidden sm:inline-flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2"
              aria-label="Další fotka"
              @pointerdown.stop
              @click="animateGo(1)"
            />
          </template>
  
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
            <div 
              v-if="currentPhoto?.author" 
              class="flex items-center gap-1.5 p-1.5 pr-3 rounded-lg bg-black/40"
            >
              <UAvatar 
                class="dark"
                :alt="currentPhoto.author.name" 
                size="sm"
              />
              <span class="text-sm font-medium text-white">
                {{ currentPhoto.author.name }}
              </span>
            </div>
            <div v-if="photos.length > 1" class="text-white text-sm bg-black/40 px-2 py-1 rounded-md">
              {{ (modelValue ?? 0) + 1 }} / {{ photos.length }}
            </div>
          </div>
        </div>
      </UTheme>
    </template>
  </UModal>
</template>
