<template>
  <div class="mb-4 font-weight-medium">
    {{ t(verify_email_page.verify_email) }}
  </div>

  <div v-if="isLoading">
    <v-progress-circular indeterminate />
  </div>

  <div v-else-if="isResent">
    <v-alert
      type="success"
      variant="tonal"
      class="mb-4"
      :text="t(verify_email_page.verify_email_sent)"
    />
  </div>

  <div v-else-if="isVerified">
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
      :text="t(verify_email_page.verify_email_success)"
    />
    <a class="text-blue text-decoration-none" :href="redirectTo">
      {{ t(verify_email_page.continue_to_app) }}
      <v-icon icon="mdi-chevron-right"></v-icon>
    </a>
  </div>

  <div v-else-if="!profile">
    {{ t(verify_email_page.not_logged_in) }}. Please
    <a :href="loginLink">log in</a>
    to continue.
  </div>

  <div v-else-if="errorCase === 'unauthorized'">
    {{ t(verify_email_page.not_logged_in) }}. Please
    <a :href="loginLink">log in</a>
    to continue.
  </div>

  <div v-else-if="errorCase === 'forbidden'">
    {{ t(verify_email_page.not_authorized) }}. Please
    <a :href="loginLink">log in</a>
    with the correct account.
  </div>

  <div v-else-if="errorCase === 'unknown'">
    <v-alert
      type="error"
      variant="tonal"
      class="mb-4"
      :text="t(verify_email_page.unknown_error)"
    />

    <v-btn
      v-if="!isResent"
      class="mt-5"
      color="primary"
      size="large"
      variant="tonal"
      block
      :disabled="isLoading"
      :loading="isResending"
      @click="handleResend"
    >
      {{
        isResending
          ? t(verify_email_page.sending)
          : t(verify_email_page.resend_verification_email)
      }}
    </v-btn>
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
      {{
        isResending
          ? t(verify_email_page.sending)
          : t(verify_email_page.resend_verification_email)
      }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { verify_email_page } from "./VerifyEmailPage.strings";
import { useRoute } from "vue-router";
import {
  useVerifyEmail,
  useResendVerification,
  getProfile,
} from "../../requests/auth";
import { TanstackError } from "@saflib/vue-spa";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";
import { useQuery } from "@tanstack/vue-query";
import { useReverseT } from "../../i18n.ts";

const { t } = useReverseT();

defineProps<{
  redirectTo: string;
}>();

const emit = defineEmits<{
  (e: "verify"): void;
}>();

const route = useRoute();
const token = route.query.token as string;

const successMessage = ref("");

const {
  mutateAsync: verifyEmail,
  isPending: isVerifying,
  isSuccess: isJustVerified,
} = useVerifyEmail();

const isVerified = computed(() => {
  return profile.value?.emailVerified || isJustVerified.value;
});

const {
  mutateAsync: resendVerification,
  isPending: isResending,
  isSuccess: isResent,
} = useResendVerification();
const { data: profile, isPending: isGettingProfile } = useQuery(getProfile());

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
    emit("verify");
    successMessage.value = "Email successfully verified!";
  } catch (error: any) {
    if (error instanceof TanstackError) {
      if (error.status === 401) {
        errorCase.value = "unauthorized";
      } else if (error.status === 403) {
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

const loginLink = linkToHref(authLinks.login, {
  params: { redirect: thisUrlEncoded },
});

// Verify email automatically on load if token is present
watch(isGettingProfile, () => {
  if (profile.value?.emailVerified) {
    successMessage.value = "Email successfully verified!";
    emit("verify");
  } else if (token) {
    handleVerify();
  }
});
</script>
