<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
const { clear } = useUserSession();

const { public: { appVersion } } = useRuntimeConfig()
const versionLabel = computed(() => `v${appVersion}`)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

const isPasswordChangeOpen = ref(false);
const passwordChangeSubmitClick = ref(false);

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="p-5 flex flex-col gap-5">
    <h2 class="text-lg font-semibold">Nastavení</h2>
    
    <div class="flex flex-col gap-2.5">
      <h3 class="text-xs font-semibold text-toned">Vzhled</h3>
      <div class="flex items-center">
        <p class="flex-1">Barevný režim</p>
        <UColorModeSwitch />
      </div>
    </div>
    <div class="flex flex-col gap-2.5">
      <h3 class="text-xs font-semibold text-toned">Uživatel</h3>
      <div class="grid grid-cols-2 gap-2.5">
        <UButton block icon="ph:password" label="Změnit heslo" variant="soft" color="neutral" @click="() => { isPasswordChangeOpen = true }"/>
        <UButton block icon="ph:sign-out" label="Odhlásit se" variant="soft" @click="logout()" />
      </div>
    </div>
    <div>
      <h3 class="text-xs font-semibold text-toned">O aplikaci</h3>
      <p class="text-xs text-toned">Verze: {{ versionLabel }}</p>
    </div>
  </div>

  <UModal v-model:open="isPasswordChangeOpen" :ui="{ content: 'max-w-sm', body: 'flex flex-col gap-2.5' }" title="Změna hesla">
    <template #body>
      <PasswordChange v-model="passwordChangeSubmitClick" />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="soft" label="Zrušit" @click="() => { isPasswordChangeOpen = false }" />
        <UButton label="Změnit" :loading="passwordChangeSubmitClick" @click="() => { passwordChangeSubmitClick = true }" />
      </div>
    </template>
  </UModal>
</template>