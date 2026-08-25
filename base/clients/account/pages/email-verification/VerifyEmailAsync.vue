<template>
  <EmailVerificationShell :title="t(verify_email.documentTitle)">
    <p class="text-body-2 text-medium-emphasis mb-6">
      {{ t(verify_email.intro) }}
    </p>
    <NewVerificationAsync />
  </EmailVerificationShell>
</template>

<script setup lang="ts">
import NewVerificationAsync from "../../../../../ory-kratos-spa/pages/new-verification/NewVerificationAsync.vue";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { verify_email } from "./VerifyEmail.strings.ts";
import EmailVerificationShell from "./EmailVerificationShell.vue";

const { t } = useReverseT();
</script>
