<template>
  <v-progress-circular
    v-if="visual.spinner"
    size="14"
    width="2"
    :color="visual.color"
    indeterminate
    class="plan-nav-icon"
  />
  <v-icon v-else size="16" :color="visual.color" :icon="visual.icon" class="plan-nav-icon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useWorkflowRunsQuery } from "../requests/workflows-queries.ts";
import { runStatusVisual, NOT_RUN_YET_ICON, type RunStatusVisual } from "../run-status-visual.ts";

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

const visual = computed<RunStatusVisual>(() => {
  if (props.kind === "markdown") {
    return { label: "doc", spinner: false, icon: "mdi-file-document-outline" };
  }
  if (props.kind === "text") {
    return { label: "file", spinner: false, icon: "mdi-file-outline" };
  }
  if (!mostRecentRun.value) {
    return { label: "not run yet", spinner: false, icon: NOT_RUN_YET_ICON };
  }
  return runStatusVisual(mostRecentRun.value);
});
</script>

<style scoped>
.plan-nav-icon {
  flex: 0 0 auto;
}
</style>
