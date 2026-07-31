<script setup lang="ts">
import { cs } from "@nuxt/ui/locale"
</script>

<template>
  <NuxtPwaManifest />
  <UApp :locale="cs">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <NuxtRouteAnnouncer />
  </UApp>
</template>