<script setup lang="ts">
import type { GalleryPhoto } from '~~/shared/types';

definePageMeta({
  layout: false,
})

const { data: photos, pending, error } = await useFetch<GalleryPhoto[]>('/api/gallery')

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const activePhotoIndex = ref<number | null>(null)
</script>


<template>
  <div class="h-full">
    <header class="sticky top-0 z-10 border-b border-muted bg-default">
      <UContainer class="flex items-center justify-between py-3.75">
        <h1 class="text-lg font-semibold">Galerie</h1>
        <UButton icon="ph:arrow-u-up-left" label="Zpět" variant="soft" color="neutral" to="/" />
      </UContainer>
    </header>
    <main class="py-4">
      <UContainer v-if="pending" class="grid grid-cols-3 sm:grid-cols-4 gap-1.25">
        <USkeleton 
          v-for="i in 12" 
          :key="i" 
          class="w-full aspect-square rounded-sm" 
        />
      </UContainer>

      <UContainer v-else-if="error" class="flex justify-center mt-10">
        <p class="text-primary">Nepodařilo se načíst galerii fotek.</p>
      </UContainer>

      <UContainer v-else-if="!photos || photos.length === 0" class="flex justify-center mt-10">
        <p class="text-muted">Zatím zde nejsou žádné fotky.</p>
      </UContainer>

      <UContainer v-else class="grid grid-cols-3 sm:grid-cols-4 gap-1.25">
        <div 
          v-for="(photo, index) in photos" 
          :key="photo.filename"
          @click="activePhotoIndex = index"
          class="relative group aspect-square overflow-hidden bg-elevated rounded-sm cursor-pointer"
        >
          <img 
            :src="photoUrl(photo.thumbnailFilename)" 
            :alt="photo.memory.text"
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-300"
          />

          <!-- Informační overlay, který se zobrazí při najetí myší (hover) -->
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 text-white">
            <span class="text-xs font-medium">{{ formatDate(photo.memory.date) }}</span>
            <span v-if="photo.memory.location" class="text-[10px] truncate opacity-90 flex items-center gap-1 mt-0.5">
              <UIcon name="ph:map-pin" class="w-3 h-3 shrink-0" /> 
              <span class="truncate">{{ photo.memory.location }}</span>
            </span>
          </div>
        </div>
      </UContainer>
    </main>
    
    <MemoryPhotoLightbox 
      v-if="photos && photos.length > 0"
      v-model="activePhotoIndex" 
      :photos="photos" 
    />
  </div>
</template>