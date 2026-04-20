<template>
  <div class="d-flex justify-center py-4">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { SettingsFlowCreated } from "@saflib/ory-kratos-sdk";
import { parseSettingsTabQuery } from "../settings/Settings.logic.ts";

const props = defineProps<{
  result: SettingsFlowCreated;
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
  const tabQ = parseSettingsTabQuery(route.query.tab);
  if (tabQ) {
    query.tab = tabQ;
  }
  void router.push({
    path: "/settings",
    query,
  });
});
</script>
