<template>
  <div>
    <h1 v-if="authApp.showFlowHeaders" class="text-h4 mb-2">
      {{ t(strings.title) }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useAuthAppConfig } from "../../configureAuthApp.ts";
import { registration_intro as strings } from "./RegistrationIntro.strings.ts";

const { t } = useReverseT();
const authApp = useAuthAppConfig();
</script>
