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
import { computed, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { linkToProps } from "@saflib/links";
import { accountLinks } from "@saflib/base-links";
import { NewVerificationAsync, parseVerificationFlowIdFromQuery } from "@saflib/ory-kratos-spa/verification";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { verify_email } from "./VerifyEmail.strings.ts";
import EmailVerificationShell from "./EmailVerificationShell.vue";

const { t } = useReverseT();
const route = useRoute();
const router = useRouter();

const verificationRequired = computed(() => route.query.required === "1");

watchEffect(() => {
  const flowId = parseVerificationFlowIdFromQuery(route.query);
  if (!flowId) {
    return;
  }
  const params: Record<string, string> = { flow: flowId };
  if (typeof route.query.return_to === "string" && route.query.return_to.trim()) {
    params.return_to = route.query.return_to.trim();
  }
  if (route.query.required === "1") {
    params.required = "1";
  }
  const { to } = linkToProps(accountLinks.verification, { params });
  if (to) {
    void router.replace(to);
  }
});
</script>
