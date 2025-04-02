<script setup lang="ts">
import { ref, watch } from "vue";
import { emailRules, passwordRules } from "../utils/rules.ts";
import { useRegister } from "../requests/auth.ts";

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
  (value: string) => !!value || "Please confirm your password",
  (value: string) => value === password.value || "Passwords must match",
];
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
      <v-form v-model="valid">
        <div class="text-subtitle-1 text-medium-emphasis">Create Account</div>

        <v-text-field
          v-model="email"
          density="compact"
          placeholder="Email address"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          :rules="emailRules"
          autofocus
        ></v-text-field>

        <div class="text-subtitle-1 text-medium-emphasis">Password</div>

        <v-text-field
          v-model="password"
          :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          :type="passwordVisible ? 'text' : 'password'"
          :rules="passwordRules"
          density="compact"
          placeholder="Enter your password"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          @click:append-inner="passwordVisible = !passwordVisible"
        ></v-text-field>

        <div class="text-subtitle-1 text-medium-emphasis">Confirm Password</div>

        <v-text-field
          v-model="confirmPassword"
          :type="passwordVisible ? 'text' : 'password'"
          :rules="confirmPasswordRules"
          density="compact"
          placeholder="Confirm your password"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
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
          Register
        </v-btn>

        <v-alert
          v-if="isError && error?.message"
          type="error"
          variant="outlined"
          class="mb-3"
        >
          {{ error.message }}
        </v-alert>

        <v-card-text class="text-center">
          <router-link class="text-blue text-decoration-none" to="/login">
            Already have an account? Log in
            <v-icon icon="mdi-chevron-right"></v-icon>
          </router-link>
        </v-card-text>
      </v-form>
    </v-card>
  </div>
</template>
