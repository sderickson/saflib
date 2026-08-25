<template>
  <v-alert type="warning" variant="tonal" class="my-4">
    <div>{{ t(strings.email_verification_required) }}</div>
    <div class="mt-3">
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        :href="verifyHref"
        rel="noopener"
      >
        {{ t(strings.verify_email) }}
      </v-btn>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useReverseT } from "../i18n.ts";
import { async_page_error as strings } from "./AsyncPageError.strings.ts";
import { baseVerifyEmailHref } from "../utils/access-error.logic.ts";

const { t } = useReverseT();

const verifyHref = computed(() => baseVerifyEmailHref());
</script>
