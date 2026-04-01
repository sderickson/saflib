<template>
  <div v-if="!secondFactor">
    <div class="float-right mb-4">
      <a
        :href="registerHref"
        class="text-primary text-decoration-none d-inline-flex align-center ga-1"
      >
        {{ t(strings.link_register) }}
        <v-icon icon="mdi-chevron-right" size="small" />
      </a>
    </div>
    <div style="clear: both"></div>
    <h1 class="text-h4 mb-2">
      {{ t(secondFactor ? strings.title_second_factor : strings.title) }}
    </h1>
    <nav
      v-if="!secondFactor"
      class="text-body-2 mb-6 d-flex flex-column flex-sm-row flex-wrap ga-2 ga-sm-6"
      aria-label="Other sign-in options"
    >
      <a
        :href="recoveryHref"
        class="text-primary text-decoration-none d-inline-flex align-center ga-1"
      >
        {{ t(strings.link_recovery) }}
        <v-icon icon="mdi-chevron-right" size="small" />
      </a>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthFlowCrossLinks } from "../common/useAuthFlowCrossLinks.ts";
import { login_intro as strings } from "./LoginIntro.strings.ts";

const props = defineProps<{
  flowReturnTo?: string | null;
  /** AAL2 login step (second factor); hides recovery link and changes the title. */
  secondFactor?: boolean;
}>();

const { t } = useReverseT();
const { registerHref, recoveryHref } = useAuthFlowCrossLinks(
  () => props.flowReturnTo,
);
</script>
