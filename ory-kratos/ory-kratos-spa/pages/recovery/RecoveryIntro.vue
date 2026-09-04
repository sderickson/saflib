<template>
  <div>
    <v-alert
      v-if="showDevHint"
      type="info"
      variant="tonal"
      class="mb-6"
    >
      {{ t(strings.dev_recovery_hint) }}
    </v-alert>
    <div class="float-right mb-4">
      <a
        :href="loginHref"
        class="text-primary text-decoration-none d-inline-flex align-center ga-1"
      >
        {{ t(strings.link_login) }}
        <v-icon icon="mdi-chevron-right" size="small" />
      </a>
    </div>
    <div style="clear: both"></div>
    <h1 v-if="authApp.showFlowHeaders" class="text-h4 mb-2">
      {{ t(strings.title) }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { isDevelopmentDeployment } from "@saflib/vue";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { useAuthFlowCrossLinks } from "../common/useAuthFlowCrossLinks.ts";
import { recovery_intro as strings } from "./RecoveryIntro.strings.ts";

const props = defineProps<{
  flowReturnTo?: string | null;
}>();

const { t } = useReverseT();
const authApp = useAuthAppConfig();
const { loginHref } = useAuthFlowCrossLinks(() => props.flowReturnTo);
const showDevHint = computed(() => isDevelopmentDeployment());
</script>
