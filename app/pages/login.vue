<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false
})

const { fetch: fetchUserSession } = useUserSession()
const { public: { appVersion, appBuild } } = useRuntimeConfig()
const versionLabel = computed(() => appBuild ? `v${appVersion} (${appBuild})` : `v${appVersion}`)

const schema = z.object({
  username: z.string().min(1, 'Zadej uživatelské jméno'),
  password: z.string().min(1, 'Zadej heslo')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/login', {
      method: 'POST',
      body: event.data
    })
    await fetchUserSession()
    await navigateTo('/')
  } catch {
    errorMessage.value = 'Neplatné přihlašovací jméno nebo heslo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="h-full flex items-center justify-center bg-default px-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-heart" class="text-primary size-6" />
          <div class="flex items-baseline gap-1">
            <h1 class="text-lg font-semibold">Spolu</h1>
            <p class="text-xs text-toned">{{ versionLabel }}</p>
          </div>
        </div>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Uživatelské jméno" name="username">
          <UInput v-model="state.username" class="w-full" placeholder="jméno" autocomplete="username" />
        </UFormField>

        <UFormField label="Heslo" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
        />

        <UButton type="submit" block :loading="loading" label="Přihlásit se" />
      </UForm>
    </UCard>
  </div>
</template>
