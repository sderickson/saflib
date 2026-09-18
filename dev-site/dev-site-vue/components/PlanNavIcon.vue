<template>
  <v-icon size="16" :color="color" :icon="icon" class="plan-nav-icon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useWorkflowRunsQuery } from "../requests/workflows-queries.ts";

const props = defineProps<{
  filePath: string;
  kind: "markdown" | "workflow" | "text";
}>();

// Only workflow (.yaml/.yml) files have a run history worth showing a
// status icon for — `.md`/other files just get a plain, fixed doc icon.
const runsQuery = useWorkflowRunsQuery(() =>
  props.kind === "workflow" ? props.filePath : undefined,
);
const mostRecentRun = computed(() => runsQuery.data.value?.runs[0]);

const icon = computed(() => {
  if (props.kind === "markdown") return "mdi-file-document-outline";
  if (props.kind === "text") return "mdi-file-outline";
  // workflow
  const run = mostRecentRun.value;
  if (!run) return "mdi-play-circle-outline";
  if (run.is_advancing) return "mdi-progress-clock";
  switch (run.status) {
    case "done":
      return "mdi-check-circle";
    case "failed":
      return "mdi-close-circle";
    case "awaiting_prompt":
    case "awaiting_user":
      return "mdi-pause-circle";
    default:
      return "mdi-progress-clock";
  }
});

const color = computed(() => {
  if (props.kind !== "workflow") return undefined;
  const run = mostRecentRun.value;
  if (!run) return undefined;
  if (run.is_advancing) return "info";
  switch (run.status) {
    case "done":
      return "success";
    case "failed":
      return "error";
    case "awaiting_prompt":
    case "awaiting_user":
      return "warning";
    default:
      return "info";
  }
});
</script>

<style scoped>
.plan-nav-icon {
  flex: 0 0 auto;
}
</style>
