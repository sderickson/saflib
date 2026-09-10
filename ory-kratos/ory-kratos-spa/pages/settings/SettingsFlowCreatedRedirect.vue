<template>
  <div class="d-flex justify-center py-4">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { SettingsFlowCreated } from "@saflib/ory-kratos-sdk";
import type { SettingsTabQueryValue } from "./Settings.logic.ts";

const props = defineProps<{
  result: SettingsFlowCreated;
  /** Path to open after flow creation (defaults to `/settings` for the auth SPA). */
  settingsPath?: string;
  /** Optional tab query when using the auth SPA settings shell. */
  tab?: SettingsTabQueryValue | null;
}>();

const router = useRouter();
const route = useRoute();

watchEffect(() => {
  const id = props.result.flow.id;
  if (!id) return;
  const query: Record<string, string> = { flow: id };
  if (
    typeof route.query.return_to === "string" &&
    route.query.return_to.trim()
  ) {
    query.return_to = route.query.return_to.trim();
  }
  if (props.tab) {
    query.tab = props.tab;
  }
  void router.replace({
    path: props.settingsPath ?? "/settings",
    query,
  });
});
</script>
