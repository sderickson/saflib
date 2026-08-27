<template>
  <EmailVerificationShell :title="t(verify_email.documentTitle)">
    <v-alert
      v-if="verificationRequired"
      type="warning"
      variant="tonal"
      class="mb-6"
    >
      {{ t(verify_email.required) }}
    </v-alert>
    <p class="text-body-2 text-medium-emphasis mb-6">
      {{ t(verify_email.intro) }}
    </p>
    <NewVerificationAsync />
  </EmailVerificationShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { NewVerificationAsync } from "@saflib/ory-kratos-spa/verification";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { verify_email } from "./VerifyEmail.strings.ts";
import EmailVerificationShell from "./EmailVerificationShell.vue";

const { t } = useReverseT();
const route = useRoute();

const verificationRequired = computed(() => route.query.required === "1");
</script>
