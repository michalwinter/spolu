<script setup lang="ts">
import { cs } from "@nuxt/ui/locale"
</script>

<template>
  <UApp :locale="cs">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <NuxtRouteAnnouncer />
  </UApp>
</template>