<script setup lang="ts">
const submitClick = defineModel<boolean>();

const currentPassword = ref('');
const newPassword = ref('');
const errorMessage = ref('');
const success = ref(false);

async function onSubmit() {
  errorMessage.value = '';

  try {
    await $fetch('/api/password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      }
    });
    currentPassword.value = '';
    newPassword.value = '';
    success.value = true;
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = 'Nastala chyba při změně hesla.';
    }
  } finally {
    submitClick.value = false;
  }

}

watch(submitClick, async (value) => {
  if (value) {
    await onSubmit();
  }
});
</script>


<template>
  <div class="flex flex-col gap-2.5">
    <UFormField label="Aktuální heslo" required>
      <UInput type="password" v-model="currentPassword" placeholder="Vaše aktuální heslo" class="w-full" />
    </UFormField>
    <UFormField label="Nové heslo" required>
      <UInput type="password" v-model="newPassword" placeholder="Vaše nové heslo" class="w-full" />
    </UFormField>
    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />
    <UAlert v-if="success" color="success" variant="subtle" title="Heslo bylo úspěšně změněno." />
  </div>
</template>