<script setup lang="ts">
import { ref } from "vue";
import { emailRules } from "../rules";
import { useForgotPassword } from "../requests/auth";

const email = ref("");
const valid = ref(null);
const successMessage = ref("");
const errorMessage = ref("");

const { mutateAsync: forgotPassword, isPending } = useForgotPassword();

const sendResetLink = async () => {
  if (!valid.value) return;

  successMessage.value = "";
  errorMessage.value = "";

  try {
    await forgotPassword({ email: email.value });
    successMessage.value =
      "If an account exists with this email, you will receive password reset instructions.";
  } catch (error) {
    errorMessage.value = "An error occurred. Please try again.";
  }
};
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
      <v-form v-model="valid">
        <div class="text-subtitle-1 text-medium-emphasis">Reset Password</div>

        <div class="text-body-2 text-medium-emphasis mb-4">
          Enter your email address and we'll send you a link to reset your
          password.
        </div>

        <v-text-field
          v-model="email"
          density="compact"
          placeholder="Email address"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          :rules="emailRules"
          :disabled="isPending"
          autofocus
        ></v-text-field>

        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          {{ successMessage }}
        </v-alert>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <v-btn
          class="my-5"
          color="blue"
          size="large"
          variant="tonal"
          block
          :disabled="!valid || isPending"
          :loading="isPending"
          @click="sendResetLink"
        >
          {{ isPending ? "Sending..." : "Send Reset Link" }}
        </v-btn>

        <v-card-text class="text-center">
          <router-link
            class="text-blue text-decoration-none"
            to="/login"
            :class="{ 'pointer-events-none': isPending }"
          >
            Back to Login <v-icon icon="mdi-chevron-right"></v-icon>
          </router-link>
        </v-card-text>
      </v-form>
    </v-card>
  </div>
</template>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>
