<template>
  <v-form v-model="valid">
    <div class="float-right">
      <router-link class="text-blue text-decoration-none" to="/register">
        {{ login_page.sign_up_now }} <v-icon icon="mdi-chevron-right"></v-icon>
      </router-link>
    </div>

    <div class="mb-4 font-weight-medium">
      {{ login_page.log_into_your_account }}
    </div>

    <v-text-field
      v-model="email"
      v-bind="login_page.email"
      prepend-inner-icon="mdi-email-outline"
      :rules="emailRules"
      :disabled="isPending"
      class="mb-4 float-clear"
      autofocus
    />

    <div
      class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
    >
      <router-link
        class="text-caption text-decoration-none text-blue"
        to="/forgot"
      >
        {{ login_page.forgot_password }}
      </router-link>
    </div>

    <v-text-field
      v-model="password"
      :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
      :type="passwordVisible ? 'text' : 'password'"
      v-bind="login_page.password"
      prepend-inner-icon="mdi-lock-outline"
      :rules="passwordRules"
      :disabled="isPending"
      class="mb-4"
      @click:append-inner="passwordVisible = !passwordVisible"
    />

    <v-alert v-if="isError" type="error" variant="tonal" class="mb-3">
      {{ login_page.invalid_credentials }}
    </v-alert>

    <v-btn
      block
      class="mb-8"
      color="primary"
      size="large"
      variant="tonal"
      :loading="isPending"
      :disabled="!valid"
      @click="handleLogin"
    >
      {{ login_page.log_in }}
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { emailRules, passwordRules } from "../../utils/rules.ts";
import { useLogin } from "../../requests/auth.ts";
import { login_page } from "./LoginPage.strings.ts";

const { mutate: login, isError, isPending } = useLogin();

const email = ref("");
const password = ref("");
const valid = ref(false);
const passwordVisible = ref(false);

const currentDomain = window.location.origin;
const allowedRedirects = [`${currentDomain}/auth/verify-email`];

const handleLogin = () => {
  if (!valid.value) return;

  login(
    { email: email.value, password: password.value },
    {
      onSuccess: () => {
        if (window.location.href.includes("redirect")) {
          const url = atob(window.location.href.split("redirect=")[1]);
          for (const redirect of allowedRedirects) {
            if (url.startsWith(redirect)) {
              window.location.href = url;
              return;
            }
          }
        }
        window.location.href = "/app/";
      },
    },
  );
};
</script>
