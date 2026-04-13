<template>
  <div>
    <div class="text-center mb-6">
      <v-icon size="64" color="primary" class="mb-4">mdi-email-check</v-icon>
    </div>
    <h1 v-if="authApp.showFlowHeaders" class="text-h4 text-center mb-2">
      {{ t(strings.title) }}
    </h1>
    <i18n-t
      v-if="identityEmail"
      scope="global"
      :keypath="lookupTKey(strings.email_line)"
      tag="p"
      class="text-body-1 text-center mb-4"
    >
      <template #email>{{ identityEmail }}</template>
    </i18n-t>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { verify_wall_intro as strings } from "./VerifyWallIntro.strings.ts";

defineProps<{
  /** Empty when the session has no display email yet. */
  identityEmail?: string;
}>();

const { t, lookupTKey } = useReverseT();
const authApp = useAuthAppConfig();
</script>
