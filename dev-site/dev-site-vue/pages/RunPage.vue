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

    <div ref="logContainer" class="run-page__logs">
      <div
        v-for="log in logs"
        :key="log.id"
        :class="['log-line', `log-${log.channel}`, { 'log-error': log.level === 'error' }]"
      >
        <span class="log-channel">[{{ log.channel }}]</span> {{ log.content }}
      </div>
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

withDefaults(defineProps<{ workflowsPath?: string }>(), { workflowsPath: "/workflows" });

const route = useRoute();
const runId = computed(() => route.params.runId as string);

const runQuery = useWorkflowRunQuery(runId);
const run = computed(() => runQuery.data.value?.run);
const logsQuery = useWorkflowRunLogsQuery(runId);
const logs = computed(() => logsQuery.data.value?.logs ?? []);
const advanceMutation = useAdvanceWorkflowRunMutation();
const cancelMutation = useCancelWorkflowRunMutation();
useRunEvents(runId);

const logContainer = ref<HTMLElement | null>(null);
watch(logs, async () => {
  await nextTick();
  const el = logContainer.value;
  if (el) el.scrollTop = el.scrollHeight;
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
.log-line {
  white-space: pre-wrap;
}
.log-channel {
  opacity: 0.6;
}
.log-tool {
  color: #4caf50;
}
.log-agent {
  color: #2196f3;
}
.log-agent-input {
  color: #ff9800;
}
.log-terminal {
  opacity: 0.7;
}
.log-error {
  color: #f44336;
  font-weight: 600;
}
</style>
