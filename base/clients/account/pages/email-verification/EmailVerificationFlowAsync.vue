<template>
  <EmailVerificationShell :title="t(verify_email.documentTitle)">
    <VerificationAsync />
  </EmailVerificationShell>
</template>

<script setup lang="ts">
import VerificationAsync from "@saflib/ory-kratos-spa/pages/verification/VerificationAsync.vue";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { verify_email } from "./VerifyEmail.strings.ts";
import EmailVerificationShell from "./EmailVerificationShell.vue";

const { t } = useReverseT();
</script>
