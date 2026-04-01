<template>
  <div class="d-flex flex-column flex-sm-row justify-center ga-3 flex-wrap">
    <v-btn
      color="primary"
      size="large"
      variant="tonal"
      tag="a"
      :href="continueHref"
    >
      {{ t(strings.cta_continue) }}
    </v-btn>
    <v-btn
      size="large"
      variant="text"
      :loading="pending"
      :aria-label="t(strings.logout_aria)"
      @click="startBrowserLogout"
    >
      {{ t(strings.cta_logout) }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { useKratosBrowserLogout } from "../registration/useKratosBrowserLogout.ts";
import { verify_wall_actions as strings } from "./VerifyWallActions.strings.ts";

defineProps<{
  continueHref: string;
}>();

const { t } = useReverseT();
const { pending, startBrowserLogout } = useKratosBrowserLogout();
</script>
