<template>
  <v-form v-model="valid">
    <v-text-field
      v-model="email"
      v-bind="register_page.email"
      prepend-inner-icon="mdi-email-outline"
      :rules="emailRules"
      class="mb-4"
      autofocus
    ></v-text-field>

    <v-text-field
      v-model="password"
      :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      :type="passwordVisible ? 'text' : 'password'"
      :rules="passwordRules"
      class="mb-4"
      v-bind="register_page.password"
      prepend-inner-icon="mdi-lock-outline"
      @click:append-inner="passwordVisible = !passwordVisible"
    ></v-text-field>

    <v-text-field
      v-model="confirmPassword"
      :type="passwordVisible ? 'text' : 'password'"
      :rules="confirmPasswordRules"
      v-bind="register_page.confirm_password"
      prepend-inner-icon="mdi-lock-outline"
      class="mb-4"
    ></v-text-field>

    <v-btn
      class="my-5"
      color="blue"
      size="large"
      variant="tonal"
      block
      :disabled="!valid || isPending"
      :loading="isPending"
      @click="handleRegister"
    >
      {{ register_page.register }}
    </v-btn>

    <v-alert v-if="isError" type="error" variant="outlined" class="mb-3">
      {{
        error?.status === 409
          ? register_page.email_already_exists
          : register_page.failed_to_register
      }}
    </v-alert>

    <v-card-text class="text-center">
      <router-link class="text-blue text-decoration-none" to="/login">
        {{ register_page.already_have_account }}
        <v-icon icon="mdi-chevron-right"></v-icon>
      </router-link>
    </v-card-text>
  </v-form>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { emailRules, passwordRules } from "../../src/utils/rules.ts";
import { useRegister } from "../../src/requests/auth.ts";
import { register_page } from "./RegisterPage.strings.ts";

const passwordVisible = ref(false);
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const valid = ref(null);

const {
  mutate: register,
  isPending,
  isError,
  error,
  isSuccess,
} = useRegister();

watch(
  () => isSuccess.value,
  (success) => {
    if (success) {
      window.location.href = "/app/";
    }
  },
);

const handleRegister = () => {
  register({
    email: email.value,
    password: password.value,
  });
};

const confirmPasswordRules = [
  (value: string) => !!value || register_page.please_confirm_password,
  (value: string) =>
    value === password.value || register_page.passwords_must_match,
];
</script>
