<template>
  <div class="email-verification-shell">
    <ContentWidth variant="narrow" class="email-verification-shell__content">
      <v-card class="pa-6 pa-md-8" variant="outlined">
        <v-alert
          v-if="showDevHint"
          type="info"
          variant="tonal"
          class="mb-6"
        >
          {{ t(verify_email.dev_verification_hint) }}
        </v-alert>
        <h1 v-if="title" class="text-h4 mb-4">{{ title }}</h1>
        <slot />
      </v-card>
    </ContentWidth>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { isDevelopmentDeployment } from "@saflib/vue";
import { useReverseT } from "@saflib/base-account-spa/i18n";
import { verify_email } from "./VerifyEmail.strings.ts";

defineProps<{
  title?: string;
}>();

const { t } = useReverseT();
const showDevHint = computed(() => isDevelopmentDeployment());
</script>

<style scoped>
.email-verification-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem 0;
}

.email-verification-shell__content {
  width: 100%;
}
</style>
