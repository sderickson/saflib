<template>
  <div class="run-page">
    <header class="run-page__head">
      <v-btn variant="text" :to="workflowsPath" class="mr-2">&larr; Workflows</v-btn>
      <span class="run-page__title">Run {{ runId }}</span>
      <v-chip class="ml-2" size="small" :color="statusColor">{{ run?.status ?? "…" }}</v-chip>
      <v-spacer />
      <span class="text-body-2 text-medium-emphasis">
        {{ run?.workflow_ref }} · step {{ run?.current_step_index }}
      </span>
    </header>

    <div ref="logContainer" class="run-page__logs" @scroll="onScroll">
      <template v-for="item in logItems" :key="item.type === 'tool-call' ? item.id : item.log.id">
        <ToolCallCard
          v-if="item.type === 'tool-call'"
          :name="item.name"
          :input="item.input"
          :result-log="item.resultLog"
        />
        <LogEntry v-else :log="item.log" />
      </template>
    </div>

    <footer class="run-page__foot">
      <div v-if="run?.status === 'awaiting_prompt'" class="mb-3">
        <em>Waiting on the agent.</em>
      </div>
      <div v-if="run?.status === 'awaiting_user'" class="mb-3">
        <em>{{ (advanceMutation.data.value as { message?: string } | undefined)?.message }}</em>
      </div>
      <v-alert
        v-if="run?.status === 'failed'"
        type="error"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        {{ failureMessage }}
      </v-alert>

      <v-btn
        v-if="advanceMutation.isPending.value"
        color="error"
        :loading="cancelMutation.isPending.value"
        @click="cancelMutation.mutate(runId)"
      >
        Stop
      </v-btn>
      <v-btn
        v-else
        color="primary"
        :disabled="run?.status === 'done' || run?.status === 'failed'"
        @click="advanceMutation.mutate(runId)"
      >
        Advance
      </v-btn>
      <span v-if="advanceMutation.isPending.value" class="text-body-2 text-medium-emphasis ml-3">
        Agent is running…
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  useWorkflowRunQuery,
  useWorkflowRunLogsQuery,
  useAdvanceWorkflowRunMutation,
  useCancelWorkflowRunMutation,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";
import LogEntry from "../components/LogEntry.vue";
import ToolCallCard from "../components/ToolCallCard.vue";
import { groupLogs } from "../group-logs.ts";

withDefaults(defineProps<{ workflowsPath?: string }>(), { workflowsPath: "/workflows" });

const route = useRoute();
const runId = computed(() => route.params.runId as string);

const runQuery = useWorkflowRunQuery(runId);
const run = computed(() => runQuery.data.value?.run);
const logsQuery = useWorkflowRunLogsQuery(runId);
const logs = computed(() => logsQuery.data.value?.logs ?? []);
const logItems = computed(() => groupLogs(logs.value));
const advanceMutation = useAdvanceWorkflowRunMutation();
const cancelMutation = useCancelWorkflowRunMutation();
useRunEvents(runId);

const logContainer = ref<HTMLElement | null>(null);
const SCROLL_BOTTOM_THRESHOLD_PX = 32;

/**
 * Whether to keep following new logs to the bottom. Tracked as its own
 * piece of state updated on every scroll event — not re-derived from
 * scroll position only at the moment new logs arrive — because during an
 * active agent turn logs can land many times a second (one SSE hint per
 * chunk); checking synchronously at that instant is too easy to race with
 * an in-progress manual scroll gesture. A real scroll event only fires
 * from an actual position change, so appending content below the fold
 * (which grows scrollHeight but not scrollTop) never flips this back on
 * by itself — only the user (or our own scroll-to-bottom) does.
 */
const isFollowing = ref(true);

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX;
}

function onScroll() {
  const el = logContainer.value;
  if (el) isFollowing.value = isNearBottom(el);
}

watch(logItems, async () => {
  await nextTick();
  const el = logContainer.value;
  if (isFollowing.value && el) {
    el.scrollTop = el.scrollHeight;
  }
});

const failureMessage = computed(() => {
  const fromMutation = (advanceMutation.data.value as { message?: string } | undefined)?.message;
  if (fromMutation) return fromMutation;
  const lastError = [...logs.value].reverse().find((l) => l.level === "error");
  return lastError?.content ?? "Failed — no error details available.";
});

const statusColor = computed(() => {
  switch (run.value?.status) {
    case "done":
      return "success";
    case "failed":
      return "error";
    case "awaiting_prompt":
    case "awaiting_user":
      return "warning";
    default:
      return undefined;
  }
});
</script>

<style scoped>
.run-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.run-page__head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-page__title {
  font-weight: 600;
}
.run-page__logs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(128, 128, 128, 0.05);
}
.run-page__foot {
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
