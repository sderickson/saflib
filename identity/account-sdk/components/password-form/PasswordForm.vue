<template>
  <v-form v-model="isFormValid">
    <v-text-field
      v-model="passwordModel.currentPassword"
      v-bind="strings.current_password_input"
      class="mb-4"
      :rules="currentPasswordRules"
      autofocus
    />
    <v-text-field
      v-model="passwordModel.newPassword"
      v-bind="strings.new_password_input"
      class="mb-4"
      :rules="newPasswordRules"
    />
    <v-text-field
      v-model="passwordModel.newPasswordConfirmation"
      v-bind="strings.new_password_confirmation_input"
      class="mb-4"
      :rules="newPasswordConfirmationRules"
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { password_form as strings } from "./PasswordForm.strings.ts";
import type { PasswordFormModel } from "./types.ts";

const passwordModel = defineModel<PasswordFormModel>({
  required: true,
});

const isFormValid = ref(false);

const currentPasswordRules = [
  (v: string) => !!v || strings.current_password_required,
];

const newPasswordRules = [(v: string) => !!v || strings.new_password_required];

const newPasswordConfirmationRules = [
  (v: string) => !!v || strings.new_password_confirmation_required,
  (v: string) =>
    v === passwordModel.value.newPassword || strings.passwords_must_match,
];

defineExpose({
  isValid: computed(() => isFormValid.value),
});
</script>
