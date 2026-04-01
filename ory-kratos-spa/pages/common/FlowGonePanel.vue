<template>
  <div>
    <h1 class="text-h4 mb-2">{{ t(strings.title) }}</h1>
    <p class="text-body-1 mb-4">{{ t(strings.body) }}</p>
    <p v-if="detailLine" class="text-body-2 text-medium-emphasis mb-4">
      {{ detailLine }}
    </p>
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
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { FlowGone } from "@saflib/ory-kratos-sdk";
import { useReverseT } from "@saflib/ory-kratos-spa/i18n";
import { flow_gone as strings } from "./FlowGone.strings.ts";

const props = withDefaults(
  defineProps<{
    result: FlowGone;
    /** Route path to navigate to when starting again (e.g. `/new-registration`). */
    restartPath: string;
    /** Optional query for restart (e.g. preserve `return_to`). */
    restartQuery?: Record<string, string>;
  }>(),
  {},
);

const { t } = useReverseT();
const router = useRouter();

const detailLine = computed(() => {
  const msg = props.result.error?.message?.trim();
  return msg || "";
});

function restart() {
  void router.push({
    path: props.restartPath,
    query: props.restartQuery ?? {},
  });
}
</script>
