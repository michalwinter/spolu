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
      disabled: true,
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
    }
  ]
])

</script>


<template>
  <!-- <div v-if="!isMobile" class="flex items-center gap-2.5">
    <UButton icon="ph:path" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }"/>
  </div>
  <USlideover v-model:open="open" side="right" :ui="{ content: 'max-w-xs' }">
    <UButton icon="ph:list" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }" />
  </USlideover> -->
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton icon="ph:list" color="neutral" variant="ghost" :ui="{ leadingIcon: 'size-5.5' }" />
  </UDropdownMenu>
</template>