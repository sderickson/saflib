<template>
  <v-form v-model="isFormValid">
    <v-text-field
      v-model="profileModel.firstName"
      v-bind="strings.first_name_input"
      class="mb-4"
      :rules="firstNameRules"
      autofocus
    />
    <v-text-field
      v-model="profileModel.lastName"
      v-bind="strings.last_name_input"
      class="mb-4"
      :rules="lastNameRules"
    />
    <v-text-field
      v-model="profileModel.email"
      v-bind="strings.email_input"
      class="mb-4"
      :rules="emailRules"
    />
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { profile_form as strings } from "./ProfileForm.strings.ts";
import type { ProfileFormModel } from "./types.ts";

const profileModel = defineModel<ProfileFormModel>({
  required: true,
});

const isFormValid = ref(false);

const firstNameRules = [(v: string) => !!v || strings.first_name_required];

const lastNameRules = [(v: string) => !!v || strings.last_name_required];

const emailRules = [
  (v: string) => !!v || strings.email_required,
  (v: string) => /.+@.+\..+/.test(v) || strings.email_must_be_valid,
];

defineExpose({
  isValid: computed(() => isFormValid.value),
});
</script>
