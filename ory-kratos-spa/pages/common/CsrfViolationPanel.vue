<template>
  <div>
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
    <p class="text-body-1 mb-4">{{ t(strings.body) }}</p>
    <div class="d-flex flex-wrap ga-3">
      <v-btn
        color="primary"
        size="large"
        variant="tonal"
        :aria-label="t(strings.cta_restart_aria)"
        @click="restart"
      >
        {{ t(strings.cta_restart) }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import type { SecurityCsrfViolation } from "@saflib/ory-kratos-sdk";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { csrf_violation as strings } from "./csrf_violation.strings.ts";

const props = defineProps<{
  result: SecurityCsrfViolation;
  restartPath: string;
  restartQuery?: Record<string, string>;
}>();

const { t } = useReverseT();
const router = useRouter();

function restart() {
  void router.push({
    path: props.restartPath,
    query: props.restartQuery ?? {},
  });
}
</script>
