<template>
  <div>
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
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { useAuthFlowCrossLinks } from "../common/useAuthFlowCrossLinks.ts";
import { verification_intro as strings } from "./VerificationIntro.strings.ts";

const props = defineProps<{
  flowReturnTo?: string | null;
}>();

const { t } = useReverseT();
const authApp = useAuthAppConfig();
const { loginHref } = useAuthFlowCrossLinks(() => props.flowReturnTo);
</script>
