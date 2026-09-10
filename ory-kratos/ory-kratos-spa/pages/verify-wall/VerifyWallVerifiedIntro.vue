<template>
  <div>
    <div class="text-center mb-6">
      <v-icon size="64" color="primary" class="mb-4">mdi-check-decagram</v-icon>
    </div>
    <h1
      v-if="authApp.showFlowHeaders"
      class="text-h4 text-center font-weight-bold mb-2"
    >
      {{ t(strings.title) }}
    </h1>
    <p class="text-body-1 text-medium-emphasis text-center mb-6">
      {{ t(strings.description) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { verify_wall_verified_intro as strings } from "./VerifyWallVerifiedIntro.strings.ts";

const { t } = useReverseT();
const authApp = useAuthAppConfig();
</script>
