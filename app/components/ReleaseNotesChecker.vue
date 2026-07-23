<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints, useLocalStorage } from '@vueuse/core'
import releaseNotes from '~/assets/data/release-notes.json'

type ReleaseNote = {
  version: string
  releasedAt: string
  title: string
  features: string[]
  fixes: string[]
}

const notes = releaseNotes as ReleaseNote[]

const { public: { appVersion } } = useRuntimeConfig()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const lastSeenVersion = useLocalStorage('spolu:last-seen-version', '')

const isOpen = ref(true)

const activeNote = computed(() => notes.find(note => note.version === appVersion) ?? null)

const formattedReleasedAt = computed(() => {
  if (!activeNote.value) {
    return ''
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(activeNote.value.releasedAt))
})

function markAsSeen() {
  if (!activeNote.value || !import.meta.client) {
    return
  }

  lastSeenVersion.value = appVersion
}

function openIfNeeded() {
  console.log('Checking if release notes should be shown...')
  console.log('Last seen version:', lastSeenVersion.value)
  console.log('Current app version:', appVersion)
  if (!activeNote.value) {
    return
  }

  const seenVersion = lastSeenVersion.value
  isOpen.value = seenVersion !== appVersion
}

watch(isOpen, (open) => {
  if (!open) {
    //markAsSeen()
  }
})

onMounted(() => {
  openIfNeeded()
})
</script>

<template>
  <template v-if="activeNote">
    <UDrawer
      v-if="isMobile"
      v-model:open="isOpen"
      should-scale-background
      :set-background-color-on-scale="false"
      :ui="{
        content: 'rounded-t-3xl',
        body: 'p-0'
      }"
    >
      <template #content>
        <div class="flex h-full flex-col max-h-[85vh]">
          <div class="flex items-start justify-between gap-4 border-b border-muted px-5 pt-5 pb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novinky</p>
              <h2 class="text-xl font-semibold">{{ activeNote.title }}</h2>
              <p class="mt-1 text-sm text-toned">
                Verze {{ activeNote.version }} · {{ formattedReleasedAt }}
              </p>
            </div>
            <UButton icon="ph:x" color="neutral" variant="ghost" @click="() => { isOpen = false }" />
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <section v-if="activeNote.features.length" class="space-y-3">
              <div class="flex items-center gap-1.25 text-sm font-semibold text-highlighted">
                <!-- <UIcon name="ph:sparkle-duotone" class="size-5 text-primary" /> -->
                <span>Funkce:</span>
              </div>
              <ul class="ml-1.25 space-y-2">
                <li v-for="feature in activeNote.features" :key="feature" class="flex items-start gap-2.5 text-sm text-default">
                  <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </section>

            <section v-if="activeNote.fixes.length" class="space-y-3">
              <div class="flex items-center gap-1.25 text-sm font-semibold text-highlighted">
                <!-- <UIcon name="ph:wrench-duotone" class="size-5 text-primary" /> -->
                <span>Opravy:</span>
              </div>
              <ul class="ml-1.25 space-y-2">
                <li v-for="fix in activeNote.fixes" :key="fix" class="flex items-start gap-2.5 text-sm text-default">
                  <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
                  <span>{{ fix }}</span>
                </li>
              </ul>
            </section>
          </div>

          <div class="border-t border-muted px-5 py-4">
            <UButton block color="primary" label="Rozumím" @click="() => { isOpen = false }" />
          </div>
        </div>
      </template>
    </UDrawer>

    <UModal
      v-else
      v-model:open="isOpen"
      :ui="{
        content: 'max-w-2xl',
        body: 'p-0'
      }"
    >
      <template #content>
        <div class="flex max-h-[80vh] flex-col">
          <div class="flex items-start justify-between gap-4 border-b border-muted px-6 pt-6 pb-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-primary">Novinky</p>
              <h2 class="text-2xl font-semibold">{{ activeNote.title }}</h2>
              <p class="mt-1 text-sm text-toned">
                Verze {{ activeNote.version }} · {{ formattedReleasedAt }}
              </p>
            </div>
            <UButton icon="ph:x" color="neutral" variant="ghost" @click="() => { isOpen = false }" />
          </div>

          <div class="grid gap-6 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <section v-if="activeNote.features.length" class="space-y-3">
              <div class="flex items-center gap-1.25 text-sm font-semibold text-highlighted">
                <!-- <UIcon name="ph:sparkle-duotone" class="size-5 text-primary" /> -->
                <span>Funkce:</span>
              </div>
              <ul class="ml-1.25 space-y-2">
                <li v-for="feature in activeNote.features" :key="feature" class="flex items-start gap-2.5 text-sm text-default">
                  <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </section>

            <section v-if="activeNote.fixes.length" class="space-y-3">
              <div class="flex items-center gap-1.25 text-sm font-semibold text-highlighted">
                <!-- <UIcon name="ph:wrench-duotone" class="size-5 text-primary" /> -->
                <span>Opravy:</span>
              </div>
              <ul class="ml-1.25 space-y-2">
                <li v-for="fix in activeNote.fixes" :key="fix" class="flex items-start gap-2.5 text-sm text-default">
                  <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
                  <span>{{ fix }}</span>
                </li>
              </ul>
            </section>
          </div>

          <div class="flex justify-end border-t border-muted px-6 py-4">
            <UButton color="primary" label="Rozumím" @click="() => { isOpen = false }" />
          </div>
        </div>
      </template>
    </UModal>
  </template>
</template>