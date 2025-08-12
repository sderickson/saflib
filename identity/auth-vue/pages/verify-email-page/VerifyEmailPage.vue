<template>
  <v-container
    class="d-flex flex-column align-center justify-center"
    style="min-height: 60vh"
  >
    <v-card class="pa-8" max-width="500" width="100%">
      <div class="text-center mb-6">
        <v-icon size="64" color="primary" class="mb-4">mdi-email-check</v-icon>
        <h1 class="text-h4 font-weight-bold mb-2">{{ t(strings.title) }}</h1>
        <p class="text-body-1 text-medium-emphasis">
          {{ t(strings.subtitle) }}
        </p>
      </div>

      <div v-if="isResent" class="text-center">
        <v-alert
          type="success"
          variant="tonal"
          class="mb-4"
          :text="t(strings.email_sent)"
        />
      </div>

      <div v-else>
        <div class="text-center mb-6">
          <p class="text-body-1 mb-4">{{ t(strings.instructions) }}</p>
          <p class="text-body-2 text-medium-emphasis">
            {{ t(strings.check_spam) }}
          </p>
        </div>

        <v-divider class="my-6"></v-divider>

        <div class="text-center">
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ t(strings.didnt_receive) }}
          </p>
          <v-btn
            color="primary"
            size="large"
            variant="tonal"
            :disabled="isResending"
            :loading="isResending"
            @click="handleResend"
          >
            {{ isResending ? t(strings.sending) : t(strings.resend_email) }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { VerifyEmailPage_page as strings } from "./VerifyEmailPage.strings.ts";
import { useVerifyEmailPageLoader } from "./VerifyEmailPage.loader";
import { useReverseT } from "../../i18n.ts";
import { useResendVerification } from "../../requests/auth";

const { t } = useReverseT();
const { profileQuery } = useVerifyEmailPageLoader();

const {
  mutateAsync: resendVerification,
  isPending: isResending,
  isSuccess: isResent,
} = useResendVerification();

const handleResend = async () => {
  try {
    await resendVerification();
  } catch (error) {
    console.error("Failed to resend verification email:", error);
  }
};

// the Async component will not render if the data is not loaded
// check to make sure the data is loaded before rendering
if (!profileQuery.data.value) {
  throw new Error("Failed to load profile");
}
</script>
