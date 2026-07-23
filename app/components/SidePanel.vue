<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const open = ref(false)

const items = ref<DropdownMenuItem[][]>([
  [
    {
      label: 'Galerie',
      icon: 'ph:images',
      to: '/gallery',
      disabled: false,
    },
    {
      label: 'Mapa',
      icon: 'ph:map-trifold',
      to: '/map',
      disabled: true,
    },
    {
      label: 'Seznamy',
      icon: 'ph:list-bullets',
      to: '/lists',
      disabled: true,
    }
  ]
])


</script>


<template>
   <!-- <div v-if="!isMobile" class="flex items-center gap-2.5">
    <UButton icon="ph:list" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }"/>
  </div> -->
  <UDropdownMenu v-if="!isMobile" :items="items" :content="{ align: 'end' }">
    <UButton icon="ph:list" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }" />
  </UDropdownMenu>
  <USlideover v-else v-model:open="open" side="right" :ui="{ content: 'max-w-xs', body: 'p-2.5 sm:p-5' }">
    <UButton icon="ph:list" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }" />

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" :ui="{
        link: 'px-3.75 py-2.5'
      }" />
    </template>
  </USlideover>
</template>