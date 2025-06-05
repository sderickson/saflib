<script setup lang="ts">
import { ref } from "vue";
import { emailRules, passwordRules } from "../utils/rules.ts";
import { useLogin } from "../requests/auth.ts";

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

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
      <v-form v-model="valid">
        <div class="text-subtitle-1 text-medium-emphasis">Account</div>

        <v-text-field
          v-model="email"
          density="compact"
          placeholder="Email address"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          :rules="emailRules"
          :disabled="isPending"
          autofocus
        />

        <div
          class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between"
        >
          Password
          <router-link
            class="text-caption text-decoration-none text-blue"
            to="/forgot"
          >
            Forgot login password?
          </router-link>
        </div>

        <v-text-field
          v-model="password"
          :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          :type="passwordVisible ? 'text' : 'password'"
          density="compact"
          placeholder="Enter your password"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          :rules="passwordRules"
          :disabled="isPending"
          @click:append-inner="passwordVisible = !passwordVisible"
        />

        <v-alert v-if="isError" type="error" variant="tonal" class="mb-3">
          Invalid credentials
        </v-alert>

        <v-btn
          block
          class="mb-8"
          color="blue"
          size="large"
          variant="tonal"
          :loading="isPending"
          :disabled="!valid"
          @click="handleLogin"
        >
          Log In
        </v-btn>

        <v-card-text class="text-center">
          <router-link class="text-blue text-decoration-none" to="/register">
            Sign up now <v-icon icon="mdi-chevron-right"></v-icon>
          </router-link>
        </v-card-text>
      </v-form>
    </v-card>
  </div>
</template>
