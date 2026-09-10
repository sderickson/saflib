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
  </div>
</template>

<script setup lang="ts">
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { verify_wall_verified_actions as strings } from "./VerifyWallVerifiedActions.strings.ts";

defineProps<{
  continueHref: string;
}>();

const { t } = useReverseT();
</script>
