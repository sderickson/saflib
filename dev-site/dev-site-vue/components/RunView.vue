<template>
  <div class="run-view">
    <header class="run-view__head">
      <v-chip v-if="runId" size="small" :color="statusVisual.color">
        <v-progress-circular v-if="statusVisual.spinner" size="12" width="2" indeterminate class="mr-1" />
        <v-icon v-else-if="statusVisual.icon" :icon="statusVisual.icon" size="14" class="mr-1" />
        {{ statusVisual.label }}
      </v-chip>
      <v-chip v-else size="small">not started</v-chip>
      <span v-if="runClock" class="run-view__clock text-body-2 text-medium-emphasis">{{
        runClock
      }}</span>
      <v-spacer />
      <span v-if="runId" class="text-body-2 text-medium-emphasis">step {{ run?.current_step_index }}</span>
    </header>

    <div class="run-view__body">
      <aside class="run-view__sidebar">
        <div
          v-for="step in steps"
          :key="step.index"
          class="run-view__sidebar-step"
          :class="stepStatusClasses(step)"
          @click="scrollToStep(step.index)"
        >
          <div class="run-view__sidebar-step-head">
            <span class="run-view__sidebar-step-index">{{ step.index }}</span>
            <span class="run-view__sidebar-step-label" :title="step.label ?? step.kind">{{
              step.label ?? step.kind
            }}</span>
          </div>
          <ul v-if="step.params" class="run-view__sidebar-step-params">
            <li
              v-for="(value, key) in step.params"
              :key="key"
              class="run-view__sidebar-step-param"
              :title="`${key}: ${value}`"
            >
              <span class="run-view__sidebar-step-param-key">{{ key }}:</span> {{ value }}
            </li>
          </ul>
        </div>
      </aside>

      <div v-if="showPreviewPane" class="run-view__logs run-view__logs--pre-run">
        <div v-if="!previewShown" class="run-view__preview-cta">
          <v-btn size="x-large" color="primary" variant="tonal" @click="openPreview()">
            Preview changes
          </v-btn>
        </div>
        <div v-else class="run-view__preview-result">
          <div class="run-view__preview-result-head">
            <span class="text-body-2 text-medium-emphasis">Preview changes</span>
            <v-spacer />
            <v-btn size="small" variant="text" @click="previewShown = false">Back</v-btn>
          </div>
          <v-progress-linear v-if="previewPending" indeterminate class="mb-4" />
          <v-alert v-if="previewError" type="error" class="mb-4">
            {{ previewError }}
          </v-alert>
          <v-alert
            v-if="previewDataReady && previewMechanicalFailures.length > 0"
            type="error"
            class="mb-4"
            density="compact"
            variant="tonal"
          >
            <div class="text-body-2 font-weight-medium mb-1">
              Preview found {{ previewMechanicalFailures.length }} mechanical failure{{
                previewMechanicalFailures.length === 1 ? "" : "s"
              }}:
            </div>
            <ul class="run-view__preview-failures">
              <li v-for="(e, i) in previewMechanicalFailures" :key="i">
                <strong>{{ e.kind }}</strong>
                ({{ e.workflow_id }}, step {{ e.step_index }}):
                {{ e.reason }}
              </li>
            </ul>
          </v-alert>
          <PreviewFileTree v-if="previewDataReady" :files="previewFiles" />
        </div>
      </div>
      <div v-else ref="logContainer" class="run-view__logs" @scroll="onScroll">
        <div v-if="logsQuery.isFetchingNextPage.value" class="run-view__logs-loading">
          Loading earlier logs…
        </div>
        <template v-for="item in logItems" :key="itemKey(item)">
          <div
            class="run-view__log-item"
            :data-step-index="itemStepIndex(item)"
            :class="{ 'run-view__log-item--sticky': isLastAgentInput(item) }"
          >
            <ToolCallCard
              v-if="item.type === 'tool-call'"
              :name="item.name"
              :input="item.input"
              :result-log="item.resultLog"
            />
            <LogEntryGroup v-else-if="item.type === 'channel-group'" :logs="item.logs" />
            <LogEntry v-else :log="item.log" />
          </div>
        </template>
        <div v-if="logsQuery.isFetchingPreviousPage.value" class="run-view__logs-loading">
          Loading later logs…
        </div>
      </div>
    </div>

    <footer class="run-view__foot">
      <div v-if="run?.status === 'awaiting_prompt'" class="mb-3">
        <em>Waiting on the agent.</em>
      </div>
      <div v-if="run?.status === 'awaiting_user'" class="mb-3">
        <em>{{ pauseMessage }}</em>
      </div>
      <v-alert
        v-if="run?.status === 'failed' && !isAdvancing"
        :type="wasCancelled ? 'info' : 'error'"
        :color="wasCancelled ? 'light-blue' : undefined"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        {{ wasCancelled ? "Stopped." : failureMessage }}
      </v-alert>

      <template v-if="run?.status === 'failed' && !isAdvancing">
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
        <div class="run-view__recovery-actions">
          <v-btn color="warning" variant="tonal" @click="continueRun({ revert: true })">
            Revert &amp; Continue
          </v-btn>
          <v-btn variant="tonal" @click="continueRun({ skip: true })">Skip Step</v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">
          Continue (the play button below) re-runs this step as-is. Revert
          &amp; Continue discards <strong>all</strong> uncommitted changes
          in the repo first (not just this step's — see the docs before
          using on a shared checkout). Skip Step commits whatever's
          currently there and moves on without running this step.
        </div>
      </template>

      <div class="run-view__foot-actions">
        <div class="run-view__foot-actions-left">
          <v-btn
            v-if="!runId"
            color="primary"
            :loading="createRunMutation.isPending.value"
            @click="initWorkflow()"
          >
            Init Workflow
          </v-btn>
          <template v-else>
            <v-btn-group
              density="comfortable"
              variant="tonal"
              divided
              :title="isOtherRunActive ? 'Another workflow is currently running' : undefined"
            >
              <v-btn
                icon="mdi-rewind"
                :disabled="isOtherRunActive || createRunMutation.isPending.value"
                :loading="createRunMutation.isPending.value"
                aria-label="Reset run"
                title="Reset — start a new run from the beginning"
                @click="resetConfirmOpen = true"
              />
              <v-btn
                icon="mdi-stop"
                :color="isActiveRun && autoMode === 'stop' ? 'primary' : undefined"
                :loading="isActiveRun && orchestrator.cancelMutation.isPending.value"
                aria-label="Stop"
                title="Stop"
                @click="selectStop()"
              />
              <v-btn
                icon="mdi-play"
                :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
                :color="isActiveRun && autoMode === 'step' ? 'primary' : undefined"
                aria-label="Play current step"
                title="Play current step"
                @click="selectStep()"
              />
              <v-btn
                icon="mdi-fast-forward"
                :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
                :color="isActiveRun && autoMode === 'workflow' ? 'primary' : undefined"
                aria-label="Play current workflow"
                title="Play current workflow"
                @click="selectWorkflow()"
              />
              <v-btn
                icon="mdi-chevron-triple-right"
                :disabled="run?.status === 'done' || isOtherRunActive || (isAdvancing && !isActiveRun)"
                :color="isActiveRun && autoMode === 'plan' ? 'primary' : undefined"
                aria-label="Play current plan"
                title="Play current plan"
                @click="selectPlan()"
              />
            </v-btn-group>
            <v-dialog v-model="resetConfirmOpen" max-width="420">
              <v-card>
                <v-card-title class="text-body-1">Reset this run?</v-card-title>
                <v-card-text class="text-body-2">
                  Starts a fresh run for this workflow from the beginning.
                  The current run is kept in history
                  <template v-if="isAdvancing && isActiveRun">
                    ; the in-progress step will be cancelled first
                  </template>.
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn variant="text" @click="resetConfirmOpen = false">Cancel</v-btn>
                  <v-btn color="primary" variant="tonal" @click="confirmReset()">
                    Reset
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <v-btn
              v-if="run?.base_commit_hash"
              variant="tonal"
              class="ml-2"
              @click="openReflection()"
            >
              Reflection
            </v-btn>
            <v-btn
              variant="tonal"
              class="ml-2"
              :disabled="isAdvancing || isOtherRunActive || gotoMutation.isPending.value"
              :loading="gotoMutation.isPending.value"
              @click="openGotoModal()"
            >
              Go to Step
            </v-btn>
            <v-dialog v-model="gotoModalOpen" max-width="560">
              <v-card>
                <v-card-title class="text-body-1">Go to step</v-card-title>
                <v-card-text class="text-body-2">
                  <p class="mb-3 text-medium-emphasis">
                    Click any step to seek there. Nested paths need a child
                    run already created (advance into the call-workflow first).
                  </p>
                  <p v-if="stepTreeQuery.isPending.value" class="text-medium-emphasis mb-0">
                    Loading step tree…
                  </p>
                  <p v-else-if="stepTreeQuery.isError.value" class="text-error mb-0">
                    {{ stepTreeQuery.error.value?.message }}
                  </p>
                  <p v-else-if="gotoMutation.isError.value" class="text-error mb-2">
                    {{ gotoMutation.error.value?.message }}
                  </p>
                  <ul v-else class="run-view__goto-tree">
                    <li
                      v-for="node in flatStepTree"
                      :key="node.path"
                      class="run-view__goto-tree-row"
                      :class="{
                        'run-view__goto-tree-row--current': node.isCurrent,
                        'run-view__goto-tree-row--disabled': !node.runId,
                      }"
                      :style="{ paddingLeft: `${0.75 + node.depth * 1.1}rem` }"
                      :title="node.runId ? `Go to ${node.path}` : 'No nested run yet — advance into the parent call-workflow first'"
                      @click="node.runId && selectGotoPath(node.path)"
                    >
                      <span class="run-view__goto-tree-path">{{ node.path }}</span>
                      <span class="run-view__goto-tree-kind">{{ node.kind }}</span>
                      <span v-if="node.label" class="run-view__goto-tree-label">{{ node.label }}</span>
                      <span v-if="node.isCurrent" class="run-view__goto-tree-marker">current</span>
                    </li>
                  </ul>
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn variant="text" @click="gotoModalOpen = false">Close</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <span v-if="isOtherRunActive" class="text-body-2 text-medium-emphasis ml-3">
              Another workflow is currently running.
            </span>
          </template>
          <p v-if="createRunMutation.isError.value" class="text-error ml-2 mb-0">
            {{ createRunMutation.error.value?.message }}
          </p>
          <span v-if="isAdvancing" class="text-body-2 text-medium-emphasis ml-3">
            Agent is running…
          </span>
        </div>
        <div class="run-view__foot-actions-right">
          <v-btn
            icon
            variant="text"
            size="small"
            :aria-label="muted ? 'Unmute' : 'Mute'"
            :title="muted ? 'Unmute' : 'Mute'"
            @click="onToggleMute()"
          >
            <v-icon :icon="volumeIcon" />
          </v-btn>
          <v-slider
            :model-value="volume"
            :disabled="muted"
            :min="0"
            :max="1"
            :step="0.05"
            hide-details
            density="compact"
            class="run-view__volume-slider"
            aria-label="Alert volume"
            @update:model-value="onVolumeChange"
          />
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useWorkflowRunQuery,
  useWorkflowRunLogsQuery,
  useWorkflowRunStepsQuery,
  useWorkflowRunStepTreeQuery,
  useWorkflowStepsQuery,
  useCreateWorkflowRunMutation,
  useGotoWorkflowRunMutation,
  usePreviewWorkflowDiffMutation,
  usePreviewWorkflowRunDiffMutation,
  flattenRunLogPages,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";
import { useRunOrchestrator } from "../run-orchestrator.ts";
import { runStatusVisual, type RunStatusVisual } from "../run-status-visual.ts";
import LogEntry from "./LogEntry.vue";
import LogEntryGroup from "./LogEntryGroup.vue";
import ToolCallCard from "./ToolCallCard.vue";
import PreviewFileTree from "./PreviewFileTree.vue";
import type { PreviewFile } from "../preview-file-tree.ts";
import { groupLogs, type LogItem } from "../group-logs.ts";
import {
  getVolume,
  setVolume,
  isMuted,
  toggleMuted,
} from "../run-alerts.ts";
import { getAgentCli } from "../agent-settings.ts";
import { formatClockSummary, summarizeRunTimings } from "../plan-run-stats.ts";
import { isMechanicalPreviewFailure } from "@saflib/new-workflows";

const props = defineProps<{
  /**
   * A registered workflow's id, or a plan file's path — needed pre-run to
   * fetch the static step list, preview changes, and create the run. Once
   * `runId` is set, everything actually resolves through the run itself
   * (which already knows its own `workflow_ref`); this stays required
   * (rather than derived from the run) since the caller always has it
   * on hand and it's what makes the pre-run layout possible at all.
   */
  workflowRef: string;
  /**
   * Present once a run exists. Footer flips to VCR controls; the main pane
   * still shows Preview while the run is `pending` (initialized / reset,
   * never advanced) — only a started run swaps in the live log.
   */
  runId?: string;
  /**
   * Other runs (e.g. earlier phases in the same plan folder), earliest
   * first, to chain a preview onto — see `usePreviewWorkflowDiffMutation`'s
   * own doc comment. Optional: the caller (`PlansPage`) decides whether/how
   * to compute this; `RunView` itself has no notion of "sibling plans".
   */
  baseRunIds?: string[];
}>();
const runId = computed(() => props.runId);
const baseRunIds = computed(() => props.baseRunIds ?? []);
const router = useRouter();
const orchestrator = useRunOrchestrator();
const pauseMessage = computed(() => {
  const fromAdvance = (
    orchestrator.advanceMutation.data.value as { message?: string } | undefined
  )?.message;
  return fromAdvance || "Paused. Review the result, then continue.";
});

const runQuery = useWorkflowRunQuery(runId);
const run = computed(() => runQuery.data.value?.run);
/** Sidebar jump target. Undefined keeps the log window on the live tip. */
const logAnchor = ref<number | undefined>(undefined);
const logsQuery = useWorkflowRunLogsQuery(runId, logAnchor);
const now = ref(new Date());
let nowTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date();
  }, 30_000);
});
onUnmounted(() => {
  if (nowTimer) clearInterval(nowTimer);
});
const runClock = computed(() => {
  if (!run.value) return undefined;
  const summary = summarizeRunTimings([run.value], now.value);
  return summary ? formatClockSummary(summary) : undefined;
});
const logs = computed(() => flattenRunLogPages(logsQuery.data.value?.pages));
const logItems = computed(() => groupLogs(logs.value));
const runStepsQuery = useWorkflowRunStepsQuery(runId);
// Pre-run: the same step list, resolved straight from the workflow/plan
// definition instead of a run's own `workflow_ref` — see
// `useWorkflowStepsQuery`'s doc comment.
const workflowStepsQuery = useWorkflowStepsQuery(() => (runId.value ? undefined : props.workflowRef));
// Config-defined (plan file) workflows are re-read from disk fresh on
// every real `advance`/`GET .../steps` call server-side — reloading this
// page is what picks up an on-disk edit; no client-side polling needed.
const steps = computed(
  () => (runId.value ? runStepsQuery.data.value?.steps : workflowStepsQuery.data.value?.steps) ?? [],
);
useRunEvents(runId);

const workflowPreviewMutation = usePreviewWorkflowDiffMutation();
const runPreviewMutation = usePreviewWorkflowRunDiffMutation();
const previewShown = ref(false);
const previewPending = computed(() =>
  runId.value ? runPreviewMutation.isPending.value : workflowPreviewMutation.isPending.value,
);
const previewError = computed(() => {
  const err = runId.value
    ? runPreviewMutation.error.value
    : workflowPreviewMutation.error.value;
  return err?.message;
});
const previewDataReady = computed(() =>
  runId.value
    ? runPreviewMutation.data.value !== undefined
    : workflowPreviewMutation.data.value !== undefined,
);
const previewEntries = computed(
  () =>
    (runId.value
      ? runPreviewMutation.data.value?.entries
      : workflowPreviewMutation.data.value?.entries) ?? [],
);
const previewFiles = computed<PreviewFile[]>(() =>
  previewEntries.value.flatMap((e) => e.files ?? []),
);
const previewMechanicalFailures = computed(() =>
  previewEntries.value.filter(isMechanicalPreviewFailure),
);

function openPreview() {
  previewShown.value = true;
  if (runId.value) {
    runPreviewMutation.mutate({ runId: runId.value, baseRunIds: baseRunIds.value });
  } else {
    workflowPreviewMutation.mutate({ id: props.workflowRef, baseRunIds: baseRunIds.value });
  }
}

/**
 * Creates the run — once it lands, the parent's own `workflow-runs` query
 * (which is what feeds this component's `runId` prop, e.g. `PlansPage`'s
 * `mostRecentRun`) refetches via this same invalidation and the prop
 * updates on its own, flipping this view to the post-run layout. No local
 * "just-created" fallback state needed: the same mechanism `PlansPage`
 * already relied on for its old inline "Start workflow" button.
 */
const createRunMutation = useCreateWorkflowRunMutation();
function initWorkflow() {
  createRunMutation.mutate({
    id: props.workflowRef,
    body: { input: {}, mode: "run", agentConfig: { cli: getAgentCli() } },
  });
}

/** Confirm dialog for the VCR rewind / reset control. */
const resetConfirmOpen = ref(false);
const gotoModalOpen = ref(false);
const gotoMutation = useGotoWorkflowRunMutation();
const stepTreeQuery = useWorkflowRunStepTreeQuery(runId, gotoModalOpen);

type FlatStepTreeNode = {
  path: string;
  kind: string;
  label?: string;
  isCurrent: boolean;
  runId?: string;
  depth: number;
};

function flattenStepTree(
  nodes:
    | {
        path: string;
        kind: string;
        label?: string;
        isCurrent: boolean;
        runId?: string;
        children?: FlatStepTreeNodeSource[];
      }[]
    | undefined,
  depth = 0,
): FlatStepTreeNode[] {
  if (!nodes?.length) return [];
  return nodes.flatMap((node) => [
    {
      path: node.path,
      kind: node.kind,
      label: node.label,
      isCurrent: node.isCurrent,
      runId: node.runId,
      depth,
    },
    ...flattenStepTree(node.children, depth + 1),
  ]);
}

type FlatStepTreeNodeSource = {
  path: string;
  kind: string;
  label?: string;
  isCurrent: boolean;
  runId?: string;
  children?: FlatStepTreeNodeSource[];
};

const flatStepTree = computed(() => flattenStepTree(stepTreeQuery.data.value?.steps));

function openGotoModal() {
  gotoMutation.reset();
  gotoModalOpen.value = true;
}

function selectGotoPath(path: string) {
  if (!runId.value) return;
  gotoMutation.mutate(
    { runId: runId.value, path },
    {
      onSuccess: () => {
        gotoModalOpen.value = false;
      },
    },
  );
}

/**
 * Stops auto-continue (and cancels an in-flight step on this run), then
 * creates a fresh run. PlansPage keys RunView on the workflow's most
 * recent run id, so the new run becomes the visible one via the create
 * mutation's `workflow-runs` invalidation.
 */
function confirmReset() {
  resetConfirmOpen.value = false;
  if (runId.value) {
    orchestrator.selectStop(runId.value, isAdvancing.value && isActiveRun.value);
  }
  initWorkflow();
}

/**
 * A run's actual effect: navigates to the real Checkout/compare page
 * (`CheckoutPage.vue`), comparing against `base_commit_hash` — the same
 * "compare against a ref" feature already used to view a branch's changes
 * against main, just given a raw commit hash instead of a branch name
 * (`resolveCompare` accepts either). `reflection=` marks this as arriving
 * from a run so the checkout page can show a "back to the run" banner and
 * the app can animate it in like a sheet — see `App.vue`'s route
 * transition and `CheckoutPage.vue`'s own banner.
 *
 * Relies on the same assumption `base_commit_hash`/`completion_hash`
 * already do: nothing else has committed to the repo since this run
 * started. `checkout.hash` is always the repo's *live* HEAD (there's no
 * way to pin it to this run's own `completion_hash`), so if unrelated
 * work landed afterward, this shows more than the run actually changed.
 */
function openReflection() {
  if (!run.value?.base_commit_hash) return;
  router.push({
    path: "/checkout",
    query: { compare: run.value.base_commit_hash, reflection: runId.value },
  });
}

/**
 * Whether a step is genuinely in progress right now, combining this page's
 * own in-flight mutation with the server's `is_advancing` (see
 * `engine.ts`'s `isRunAdvancing`). The mutation alone isn't enough: a page
 * reload (or a container restart) loses that client-side pending state
 * entirely, even while a step is still actively running server-side —
 * without the server signal, a freshly-loaded page shows a plain idle
 * Advance button with no way to tell "it's already working" from "nothing
 * is happening", and no way to Stop it either.
 */
const isAdvancing = computed(
  () =>
    (orchestrator.activeRunId.value === runId.value && orchestrator.advanceMutation.isPending.value) ||
    run.value?.is_advancing === true,
);

/**
 * Preview only before anything has actually started — no run yet, or a
 * fresh Init/Reset (`pending`, idle). Go-to used to leave runs `pending`
 * mid-workflow, which hid the live log pane behind this preview while the
 * agent was already writing logs; also the first advance of a brand-new
 * run stays `pending` until the step finishes, so `isAdvancing` must
 * force the log pane on.
 */
const showPreviewPane = computed(() => {
  if (!runId.value) return true;
  // Avoid a blank flash while the run row loads after Init/Reset.
  if (!run.value) return true;
  if (isAdvancing.value) return false;
  return run.value.status === "pending";
});

/** Some *other* run is currently being driven — only one workflow can run at a time. */
const isOtherRunActive = computed(
  () => orchestrator.activeRunId.value !== undefined && orchestrator.activeRunId.value !== runId.value,
);
/** This run is the one the orchestrator is (or most recently was) driving — gates showing its mode color/spinner. */
const isActiveRun = computed(() => orchestrator.activeRunId.value === runId.value);

/** Same spinner/paused/status icon logic as the plans-page nav icon — kept
 * in sync via the shared `runStatusVisual` util rather than duplicated. */
const statusVisual = computed<RunStatusVisual>(() =>
  runStatusVisual(
    run.value ? { ...run.value, is_advancing: isAdvancing.value } : undefined,
  ),
);
const wasCancelled = computed(() => run.value?.was_cancelled === true);

/**
 * Done/running status coloring, derived purely from `run.current_step_index`
 * — no per-step status from the server needed. A step before the run's
 * current index has already succeeded; the step *at* the current index is
 * whatever's blocking progress right now (mid-turn, or the one that just
 * failed); anything after is simply not reached yet.
 */
function stepStatusClasses(step: { index: number }): Record<string, boolean> {
  const currentIndex = run.value?.current_step_index;
  return {
    "run-view__sidebar-step--done": currentIndex !== undefined && step.index < currentIndex,
    "run-view__sidebar-step--running": currentIndex !== undefined && step.index === currentIndex,
    "run-view__sidebar-step--active": step.index === currentStepIndex.value,
  };
}

const extraPrompt = ref("");

/**
 * The single "keep this run moving" action — a plain advance in most
 * states, and what used to be a separate "Retry" button when `failed`
 * (there's no meaningful difference at the API level: both are just a
 * POST /advance, optionally carrying `revert`/`skip`/an extra prompt — see
 * the ask to fold "retry" into one universal "continue"/Play action).
 * Routes through the shared orchestrator so it participates in the same
 * in-flight/active-run bookkeeping as the VCR buttons below.
 */
function continueRun(options: { revert?: boolean; skip?: boolean } = {}) {
  orchestrator.continueRun(runId.value!, props.workflowRef, {
    ...options,
    extraPrompt: extraPrompt.value.trim() || undefined,
  });
  extraPrompt.value = "";
}

/**
 * The VCR-style playback mode, one of four (radio-style — exactly one
 * active) — see `run-orchestrator.ts`'s own doc comment for what each
 * means. Lives in the shared orchestrator (not local state) so it — and
 * the auto-continue chain and plan-cascade it drives — survives navigating
 * away from this run entirely, rather than dying when this component
 * unmounts.
 */
const autoMode = computed(() => orchestrator.autoMode.value);

function selectStop() {
  orchestrator.selectStop(runId.value!, isAdvancing.value);
}
function selectStep() {
  orchestrator.selectStep(runId.value!, props.workflowRef);
}
function selectWorkflow() {
  orchestrator.selectWorkflow(runId.value!, props.workflowRef);
}
function selectPlan() {
  orchestrator.selectPlan(runId.value!, props.workflowRef);
}

// Volume/mute — local reactive mirror of run-alerts.ts's own
// localStorage-backed state, so this control (and any other page that
// adds one later) reflects the same persisted setting everywhere.
const volume = ref(getVolume());
const muted = ref(isMuted());

function onVolumeChange(next: number) {
  setVolume(next);
  volume.value = getVolume();
}

function onToggleMute() {
  muted.value = toggleMuted();
}

const volumeIcon = computed(() => {
  if (muted.value || volume.value <= 0) return "mdi-volume-off";
  if (volume.value < 0.5) return "mdi-volume-medium";
  return "mdi-volume-high";
});

const logContainer = ref<HTMLElement | null>(null);
const SCROLL_BOTTOM_THRESHOLD_PX = 32;
const SCROLL_TOP_THRESHOLD_PX = 80;

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
/** Guard so overlapping scroll events don't fire duplicate page fetches. */
let loadingOlder = false;
let loadingNewer = false;
/** Step index to scroll into view once its logs arrive. */
const pendingScrollStep = ref<number | undefined>(undefined);

function isNearBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX;
}

async function loadOlderLogsIfNeeded(el: HTMLElement) {
  if (
    loadingOlder ||
    el.scrollTop > SCROLL_TOP_THRESHOLD_PX ||
    !logsQuery.hasNextPage.value ||
    logsQuery.isFetchingNextPage.value
  ) {
    return;
  }
  loadingOlder = true;
  const prevHeight = el.scrollHeight;
  const prevTop = el.scrollTop;
  try {
    await logsQuery.fetchNextPage();
    await nextTick();
    // Keep the same rows under the viewport after prepending older history.
    el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
  } finally {
    loadingOlder = false;
  }
}

async function loadNewerLogsIfNeeded(el: HTMLElement) {
  if (
    loadingNewer ||
    !isNearBottom(el) ||
    !logsQuery.hasPreviousPage.value ||
    logsQuery.isFetchingPreviousPage.value
  ) {
    return;
  }
  loadingNewer = true;
  try {
    await logsQuery.fetchPreviousPage();
  } finally {
    loadingNewer = false;
  }
}

function itemStepIndex(item: LogItem): number | null {
  if (item.type === "tool-call") return item.useLog.step_index;
  if (item.type === "channel-group") return item.logs[0]!.step_index;
  return item.log.step_index;
}

function itemKey(item: LogItem): string {
  if (item.type === "tool-call") return item.id;
  if (item.type === "channel-group") return item.id;
  return item.log.id;
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
 * Which step's logs are at the *bottom* of the visible viewport — drives
 * the sidebar highlight. That's the step whose content you're actually
 * reading as you scroll down (the top of the viewport is usually already-
 * read history scrolling away), recomputed from actual rendered positions
 * rather than the run's own `current_step_index` so scrolling back through
 * history highlights the step you're looking at, not the live one.
 */
const currentStepIndex = ref<number | undefined>(undefined);

function updateCurrentStepIndex() {
  const el = logContainer.value;
  if (!el) return;
  const containerBottom = el.getBoundingClientRect().bottom;
  const items = el.querySelectorAll<HTMLElement>("[data-step-index]");
  let found: number | undefined;
  for (const itemEl of items) {
    // Keep advancing `found` through every item that's started above the
    // viewport's bottom edge; the last one is whichever item occupies (or
    // overlaps) that edge. Items entirely below it end the search.
    if (itemEl.getBoundingClientRect().top < containerBottom) {
      found = Number(itemEl.dataset.stepIndex);
    } else {
      break;
    }
  }
  if (found === undefined && items.length > 0) {
    found = Number(items[0].dataset.stepIndex);
  }
  currentStepIndex.value = found;
}

function scrollLogTo(target: HTMLElement) {
  const el = logContainer.value;
  if (!el) return;
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ block: "start" });
    return;
  }
  el.scrollTop = target.offsetTop;
}

function scrollToStep(index: number) {
  const el = logContainer.value;
  const target = el?.querySelector<HTMLElement>(`[data-step-index="${index}"]`);
  if (target) {
    isFollowing.value = false;
    scrollLogTo(target);
    return;
  }
  // Not in the loaded window — re-anchor the log query at this step, then
  // scroll once those rows render. Scrolling up or down from there pages
  // the gap in that direction.
  isFollowing.value = false;
  pendingScrollStep.value = index;
  logAnchor.value = index;
}

function onScroll() {
  const el = logContainer.value;
  if (el) {
    // Stick to the live tail only when this window already includes it.
    // A mid-log jump still has newer pages below; treating "near the
    // bottom of what's loaded" as following would yank the viewport.
    isFollowing.value = !logsQuery.hasPreviousPage.value && isNearBottom(el);
    void loadOlderLogsIfNeeded(el);
    void loadNewerLogsIfNeeded(el);
  }
  updateCurrentStepIndex();
}

watch(logItems, async () => {
  await nextTick();
  const el = logContainer.value;
  const pending = pendingScrollStep.value;
  if (pending !== undefined && el) {
    const target = el.querySelector<HTMLElement>(`[data-step-index="${pending}"]`);
    if (target) {
      scrollLogTo(target);
      pendingScrollStep.value = undefined;
    } else if (!logsQuery.isFetching.value) {
      pendingScrollStep.value = undefined;
    }
  } else if (isFollowing.value && el) {
    el.scrollTop = el.scrollHeight;
  }
  updateCurrentStepIndex();
});

const failureMessage = computed(() => {
  const fromMutation = (orchestrator.advanceMutation.data.value as { message?: string } | undefined)
    ?.message;
  if (fromMutation) return fromMutation;
  const lastError = [...logs.value].reverse().find((l) => l.level === "error");
  return lastError?.content ?? "Failed — no error details available.";
});

// Sound/notification/plan-cascade on a run finishing on its own now lives
// in `run-orchestrator.ts`, not here — see its own doc comment for why:
// this component (and its local watchers) would otherwise die the moment
// you navigated away from this run, silently stopping the auto-continue
// chain and the plan cascade along with it.
</script>

<style scoped>
.run-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.run-view__head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-view__clock {
  margin-left: 0.5rem;
}
.run-view__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}
.run-view__sidebar {
  flex: 0 0 220px;
  overflow-y: auto;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 0.5rem 0;
}
.run-view__sidebar-step {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  border-left: 3px solid transparent;
}
.run-view__sidebar-step:hover {
  background: rgba(128, 128, 128, 0.08);
}
/* Done/running reflect the run's own progress (current_step_index) —
   unstarted steps keep the plain, uncolored background. */
.run-view__sidebar-step--done {
  background: rgba(var(--v-theme-success), 0.12);
}
.run-view__sidebar-step--running {
  background: rgba(var(--v-theme-warning), 0.16);
}
/* The step currently scrolled to (bottom-of-viewport) — independent of
   done/running, so it layers a border + bold on top of either. */
.run-view__sidebar-step--active {
  border-left-color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.run-view__sidebar-step-head {
  display: flex;
  gap: 0.5rem;
}
.run-view__sidebar-step-index {
  opacity: 0.5;
}
.run-view__sidebar-step-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.run-view__sidebar-step-params {
  margin: 0.2rem 0 0 1.25rem;
  padding: 0;
  list-style: disc;
  opacity: 0.7;
}
.run-view__sidebar-step-param {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
}
.run-view__sidebar-step-param-key {
  opacity: 0.7;
}
.run-view__logs {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  font-size: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(128, 128, 128, 0.05);
}
.run-view__preview-failures {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.run-view__logs-loading {
  opacity: 0.6;
  font-size: 0.8rem;
  padding-bottom: 0.5rem;
}
.run-view__log-item--sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
.run-view__foot {
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.run-view__recovery-actions {
  display: flex;
  gap: 0.5rem;
}
.run-view__foot-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.run-view__foot-actions-left,
.run-view__foot-actions-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.run-view__volume-slider {
  /* A flex child with no explicit width shrinks toward its own tiny
     intrinsic content width (just the thumb), which broke the slider's
     drag-to-value mapping — it only ever reported the two extremes. */
  flex: 0 0 120px;
  width: 120px;
  margin-right: 0.5rem;
}
.run-view__goto-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
}
.run-view__goto-tree-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.run-view__goto-tree-row:last-child {
  border-bottom: none;
}
.run-view__goto-tree-row:hover:not(.run-view__goto-tree-row--disabled) {
  background: rgba(var(--v-theme-primary), 0.08);
}
.run-view__goto-tree-row--current {
  background: rgba(var(--v-theme-warning), 0.14);
  font-weight: 600;
}
.run-view__goto-tree-row--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.run-view__goto-tree-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  opacity: 0.7;
  min-width: 2.5rem;
}
.run-view__goto-tree-kind {
  flex: 0 0 auto;
}
.run-view__goto-tree-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}
.run-view__goto-tree-marker {
  flex: 0 0 auto;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
}
</style>
