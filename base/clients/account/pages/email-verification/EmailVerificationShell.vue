<template>
  <ContentWidth variant="narrow" class="py-8">
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
  </ContentWidth>
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
