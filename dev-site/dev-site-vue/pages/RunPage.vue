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

    <div class="run-page__body">
      <aside class="run-page__sidebar">
        <div
          v-for="step in steps"
          :key="step.index"
          class="run-page__sidebar-step"
          :class="{ 'run-page__sidebar-step--active': step.index === currentStepIndex }"
          @click="scrollToStep(step.index)"
        >
          <span class="run-page__sidebar-step-index">{{ step.index }}</span>
          <span class="run-page__sidebar-step-label">{{ step.label ?? step.kind }}</span>
        </div>
      </aside>

      <div ref="logContainer" class="run-page__logs" @scroll="onScroll">
        <template v-for="item in logItems" :key="item.type === 'tool-call' ? item.id : item.log.id">
          <div
            class="run-page__log-item"
            :data-step-index="itemStepIndex(item)"
            :class="{ 'run-page__log-item--sticky': isLastAgentInput(item) }"
          >
            <ToolCallCard
              v-if="item.type === 'tool-call'"
              :name="item.name"
              :input="item.input"
              :result-log="item.resultLog"
            />
            <LogEntry v-else :log="item.log" />
          </div>
        </template>
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

      <template v-if="run?.status === 'failed' && !advanceMutation.isPending.value">
        <v-textarea
          v-model="extraPrompt"
          label="Guidance for the next attempt (optional)"
          placeholder="e.g. Use ignorePlural, the table name is already singular."
          rows="2"
          auto-grow
          density="compact"
          variant="outlined"
          class="mb-3"
          hide-details
        />
        <div class="run-page__recovery-actions">
          <v-btn color="primary" @click="retry()">Retry</v-btn>
          <v-btn color="warning" variant="tonal" @click="retry({ revert: true })">
            Revert &amp; Retry
          </v-btn>
          <v-btn variant="tonal" @click="retry({ skip: true })">Skip Step</v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          Retry re-runs this step as-is. Revert &amp; Retry discards
          <strong>all</strong> uncommitted changes in the repo first (not
          just this step's — see the docs before using on a shared
          checkout). Skip Step commits whatever's currently there and
          moves on without running this step.
        </div>
      </template>

      <v-btn
        v-if="advanceMutation.isPending.value"
        color="error"
        :loading="cancelMutation.isPending.value"
        @click="cancelMutation.mutate(runId)"
      >
        Stop
      </v-btn>
      <v-btn
        v-else-if="run?.status !== 'failed'"
        color="primary"
        :disabled="run?.status === 'done'"
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
  useWorkflowRunStepsQuery,
  useAdvanceWorkflowRunMutation,
  useCancelWorkflowRunMutation,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";
import LogEntry from "../components/LogEntry.vue";
import ToolCallCard from "../components/ToolCallCard.vue";
import { groupLogs, type LogItem } from "../group-logs.ts";

withDefaults(defineProps<{ workflowsPath?: string }>(), { workflowsPath: "/workflows" });

const route = useRoute();
const runId = computed(() => route.params.runId as string);

const runQuery = useWorkflowRunQuery(runId);
const run = computed(() => runQuery.data.value?.run);
const logsQuery = useWorkflowRunLogsQuery(runId);
const logs = computed(() => logsQuery.data.value?.logs ?? []);
const logItems = computed(() => groupLogs(logs.value));
const stepsQuery = useWorkflowRunStepsQuery(runId);
const steps = computed(() => stepsQuery.data.value?.steps ?? []);
const advanceMutation = useAdvanceWorkflowRunMutation();
const cancelMutation = useCancelWorkflowRunMutation();
useRunEvents(runId);

const extraPrompt = ref("");

function retry(options: { revert?: boolean; skip?: boolean } = {}) {
  advanceMutation.mutate({
    runId: runId.value,
    ...options,
    extraPrompt: extraPrompt.value.trim() || undefined,
  });
  extraPrompt.value = "";
}

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

function itemStepIndex(item: LogItem): number | null {
  return item.type === "tool-call" ? item.useLog.step_index : item.log.step_index;
}

/**
 * The most recent instruction handed to the agent — kept visible via a
 * `position: sticky` wrapper so it doesn't scroll out of view while
 * reading earlier history (the whole point of scrolling back is usually
 * "what was I asked to do again?").
 */
const lastAgentInputLogId = computed(() => {
  for (let i = logs.value.length - 1; i >= 0; i--) {
    if (logs.value[i].channel === "agent-input") return logs.value[i].id;
  }
  return undefined;
});
function isLastAgentInput(item: LogItem): boolean {
  return item.type === "single" && item.log.id === lastAgentInputLogId.value;
}

/**
 * Which step's logs are at the top of the visible viewport — drives the
 * sidebar highlight. Recomputed from actual rendered positions (not the
 * run's own `current_step_index`) so scrolling back through history
 * highlights the step you're actually looking at, not the live one.
 */
const currentStepIndex = ref<number | undefined>(undefined);

function updateCurrentStepIndex() {
  const el = logContainer.value;
  if (!el) return;
  const containerTop = el.getBoundingClientRect().top;
  const items = el.querySelectorAll<HTMLElement>("[data-step-index]");
  let found: number | undefined;
  for (const itemEl of items) {
    if (itemEl.getBoundingClientRect().bottom - containerTop > 0) {
      found = Number(itemEl.dataset.stepIndex);
      break;
    }
  }
  if (found === undefined && items.length > 0) {
    found = Number(items[items.length - 1].dataset.stepIndex);
  }
  currentStepIndex.value = found;
}

function scrollToStep(index: number) {
  const el = logContainer.value;
  const target = el?.querySelector<HTMLElement>(`[data-step-index="${index}"]`);
  target?.scrollIntoView({ block: "start" });
}

function onScroll() {
  const el = logContainer.value;
  if (el) isFollowing.value = isNearBottom(el);
  updateCurrentStepIndex();
}

watch(logItems, async () => {
  await nextTick();
  const el = logContainer.value;
  if (isFollowing.value && el) {
    el.scrollTop = el.scrollHeight;
  }
  updateCurrentStepIndex();
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
.run-page__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}
.run-page__sidebar {
  flex: 0 0 220px;
  overflow-y: auto;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 0.5rem 0;
}
.run-page__sidebar-step {
  padding: 0.4rem 0.75rem;
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  border-left: 3px solid transparent;
}
.run-page__sidebar-step:hover {
  background: rgba(128, 128, 128, 0.08);
}
.run-page__sidebar-step--active {
  border-left-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 600;
}
.run-page__sidebar-step-index {
  opacity: 0.5;
}
.run-page__sidebar-step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.run-page__log-item--sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
.run-page__foot {
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-page__recovery-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
