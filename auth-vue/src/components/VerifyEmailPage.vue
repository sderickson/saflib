<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  useVerifyEmail,
  useResendVerification,
  useGetProfile,
} from "../requests/auth";
import { TanstackError } from "@saflib/vue-spa";

const route = useRoute();
const token = route.query.token as string;

const successMessage = ref("");

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
const { data: profile, isPending: isGettingProfile } = useGetProfile();

const isLoading = computed(
  () => isVerifying.value || isResending.value || isGettingProfile.value,
);

const errorCase = ref<"unauthorized" | "forbidden" | "unknown" | null>(null);

const handleVerify = async () => {
  if (!token || !profile) return;

  successMessage.value = "";
  errorCase.value = null;

  try {
    await verifyEmail({ token });
    successMessage.value = "Email successfully verified!";
  } catch (error: any) {
    console.log("error", error);
    console.error(error);
    if (error instanceof TanstackError) {
      console.log("error.status", error.status);
      if (error.status === 401) {
        errorCase.value = "unauthorized";
      } else if (error.status === 403) {
        console.log("error.status", error.status);
        errorCase.value = "forbidden";
      } else {
        errorCase.value = "unknown";
      }
    } else {
      errorCase.value = "unknown";
    }
  }
};

const handleResend = async () => {
  if (!profile) return;

  successMessage.value = "";
  errorCase.value = null;

  try {
    await resendVerification();
    successMessage.value = "Please check your email for the verification link.";
  } catch (error: any) {
    errorCase.value = "unknown";
  }
};

const thisUrlEncoded = btoa(window.location.href);

// Verify email automatically on load if token is present
onMounted(() => {
  if (token) {
    handleVerify();
  }
});
</script>

<template>
  <div class="d-flex justify-center align-center flex-column fill-height">
    <v-card class="pa-12" elevation="8" rounded="lg" width="448">
      <v-card-title class="mb-4">Verify Email</v-card-title>

      <div v-if="isLoading">
        <v-skeleton type="text" height="200px" />
      </div>

      <div v-else-if="isResent">
        Verification email sent. Please check your email for the verification
        link.
      </div>

      <div v-else-if="isVerified">
        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
          text="You have successfully verified your email address."
        />
        <a class="text-blue text-decoration-none" href="/app/">
          Continue to App <v-icon icon="mdi-chevron-right"></v-icon>
        </a>
      </div>

      <div v-else-if="!profile">
        You are not logged in. Please
        <a :href="`/auth/login?redirect=${thisUrlEncoded}`">log in</a> to
        continue.
      </div>

      <div v-else-if="!token">
        <v-btn
          class="mt-5"
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
      </div>

      <div v-else-if="errorCase === 'unauthorized'">
        You are not logged in. Please
        <a :href="`/auth/login?redirect=${thisUrlEncoded}`">log in</a> to
        continue.
      </div>

      <div v-else-if="errorCase === 'forbidden'">
        You are not authorized to verify this email. Please
        <a :href="`/auth/login?redirect=${thisUrlEncoded}`">log in</a> with the
        correct account.
      </div>

      <div v-else-if="errorCase === 'unknown'">
        Unknown error. Please try again.

        <v-btn
          v-if="!isResent"
          class="mt-5"
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
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.pointer-events-none {
  pointer-events: none;
  opacity: 0.7;
}
</style>
