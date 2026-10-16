<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
const { logout: signOut } = useOfflineSession()
const toast = useToast()

const { public: { appVersion, appBuild } } = useRuntimeConfig()
const versionLabel = computed(() => appBuild ? `v${appVersion} (${appBuild})` : `v${appVersion}`)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')
const {
  pendingCreates,
  pendingCreatesCount,
  isSyncingPendingCreates,
  isSyncingOfflineData,
  syncAll,
} = useMemories()

const isPasswordChangeOpen = ref(false);
const passwordChangeSubmitClick = ref(false);

async function logout() {
  if (!navigator.onLine) {
    toast.add({ title: 'Odhlášení vyžaduje připojení k internetu.', color: 'warning' })
    return
  }

  if (pendingCreatesCount.value > 0
    && !window.confirm(`Máte ${pendingCreatesCount.value} neodeslaných vzpomínek, které se odhlášením smažou. Opravdu se odhlásit?`)) {
    return
  }

  try {
    await signOut()
  } catch {
    toast.add({ title: 'Odhlášení se nepodařilo.', color: 'error' })
  }
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

    <div class="flex flex-col gap-2.5">
      <h3 class="text-xs font-semibold text-toned">Offline synchronizace</h3>
      <div class="rounded-lg border border-default p-3.75 flex flex-col gap-2.5">
        <p class="text-sm text-default">
          Čekající vzpomínky k odeslání: <strong>{{ pendingCreatesCount }}</strong>
        </p>
        <p class="text-xs text-toned">
          Všechny vzpomínky a fotky se ukládají do zařízení, aby šly zobrazit i bez připojení.
        </p>
        <UButton
          icon="ph:arrows-clockwise"
          :loading="isSyncingPendingCreates || isSyncingOfflineData"
          variant="soft"
          color="primary"
          label="Synchronizovat nyní"
          @click="syncAll()"
        />
        <ul v-if="pendingCreates.length" class="text-xs text-toned flex flex-col gap-1.25">
          <li v-for="item in pendingCreates" :key="item.id">
            {{ new Date(item.createdAt).toLocaleString('cs-CZ') }} · {{ item.text.slice(0, 50) }}{{ item.text.length > 50 ? '…' : '' }}
          </li>
        </ul>
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