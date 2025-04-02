<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useVerifyEmail, useResendVerification } from "../requests/auth";

const route = useRoute();
const token = route.query.token as string;

const successMessage = ref("");
const errorMessage = ref("");

const {
  mutateAsync: verifyEmail,
  isPending: isVerifying,
  isSuccess: isVerified,
} = useVerifyEmail();
const {
  mutateAsync: resendVerification,
  isPending: isResending,
  isSuccess: isResent,
} = useResendVerification();

const isLoading = computed(() => isVerifying.value || isResending.value);

const done = computed(() => isVerified.value || isResent.value);

const handleVerify = async () => {
  if (!token) return;

  successMessage.value = "";
  errorMessage.value = "";

  try {
    await verifyEmail({ token });
    successMessage.value = "Email successfully verified!";
  } catch (error: any) {
    errorMessage.value =
      error?.message || "Failed to verify email. Please try again.";
  }
};

const handleResend = async () => {
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await resendVerification();
    successMessage.value = "Please check your email for the verification link.";
  } catch (error: any) {
    errorMessage.value =
      error?.message ||
      "Failed to resend verification email. Please try again.";
  }
};

// Verify email automatically on load if token is present
onMounted(() => {
  if (token) {
    handleVerify();
  }
});
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="mx-auto pa-12 pb-8" elevation="8" width="448" rounded="lg">
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

      <div v-if="!done" class="text-subtitle-1 text-medium-emphasis">
        Verify Email
      </div>

      <div v-if="!done" class="text-body-2 text-medium-emphasis mb-4">
        Please verify your email address to continue.
      </div>

      <!-- Show resend button if verification failed or no token -->
      <v-btn
        v-if="(token && errorMessage) || (!token && !isResent)"
        class="my-5"
        color="blue"
        size="large"
        variant="tonal"
        block
        :disabled="isLoading"
        :loading="isResending"
        @click="handleResend"
      >
        {{ isResending ? "Sending..." : "Resend Verification Email" }}
      </v-btn>

      <v-card-text class="text-center">
        <a
          v-if="token && successMessage"
          class="text-blue text-decoration-none"
          href="/app/"
        >
          Continue to App <v-icon icon="mdi-chevron-right"></v-icon>
        </a>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>
