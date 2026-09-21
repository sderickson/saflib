<template>
  <div class="run-view">
    <header class="run-view__head">
      <v-chip size="small" :color="statusVisual.color">
        <v-progress-circular v-if="statusVisual.spinner" size="12" width="2" indeterminate class="mr-1" />
        <v-icon v-else-if="statusVisual.icon" :icon="statusVisual.icon" size="14" class="mr-1" />
        {{ statusVisual.label }}
      </v-chip>
      <v-spacer />
      <span class="text-body-2 text-medium-emphasis">step {{ run?.current_step_index }}</span>
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

      <div ref="logContainer" class="run-view__logs" @scroll="onScroll">
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
      </div>
    </div>

    <footer class="run-view__foot">
      <div v-if="run?.status === 'awaiting_prompt'" class="mb-3">
        <em>Waiting on the agent.</em>
      </div>
      <div v-if="run?.status === 'awaiting_user'" class="mb-3">
        <em>{{ (advanceMutation.data.value as { message?: string } | undefined)?.message }}</em>
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
          <v-btn-group density="comfortable" variant="tonal" divided>
            <v-btn
              icon="mdi-stop"
              :color="autoMode === 'stop' ? 'primary' : undefined"
              :loading="cancelMutation.isPending.value"
              aria-label="Stop"
              title="Stop"
              @click="selectStop()"
            />
            <v-btn
              icon="mdi-play"
              :disabled="isAdvancing || run?.status === 'done'"
              :color="autoMode === 'step' ? 'primary' : undefined"
              aria-label="Play current step"
              title="Play current step"
              @click="selectStep()"
            />
            <v-btn
              icon="mdi-fast-forward"
              :disabled="isAdvancing || run?.status === 'done'"
              :color="autoMode === 'workflow' ? 'primary' : undefined"
              aria-label="Play current workflow"
              title="Play current workflow"
              @click="selectWorkflow()"
            />
            <v-btn
              icon="mdi-chevron-triple-right"
              :disabled="isAdvancing || run?.status === 'done'"
              :color="autoMode === 'plan' ? 'primary' : undefined"
              aria-label="Play current plan"
              title="Play current plan"
              @click="selectPlan()"
            />
          </v-btn-group>
          <v-btn
            v-if="run?.base_commit_hash"
            variant="tonal"
            class="ml-3"
            @click="openReflection()"
          >
            Reflection
          </v-btn>
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
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useWorkflowRunQuery,
  useWorkflowRunLogsQuery,
  useWorkflowRunStepsQuery,
  useAdvanceWorkflowRunMutation,
  useCancelWorkflowRunMutation,
} from "../requests/workflows-queries.ts";
import { useRunEvents } from "../requests/use-run-events.ts";
import { runStatusVisual, type RunStatusVisual } from "../run-status-visual.ts";
import LogEntry from "./LogEntry.vue";
import LogEntryGroup from "./LogEntryGroup.vue";
import ToolCallCard from "./ToolCallCard.vue";
import { groupLogs, type LogItem } from "../group-logs.ts";
import {
  unlockAudio,
  playSuccessBell,
  playFailureQuack,
  requestNotificationPermission,
  notify,
  getVolume,
  setVolume,
  isMuted,
  toggleMuted,
} from "../run-alerts.ts";

const props = defineProps<{
  runId: string;
  /**
   * Start already in "plan" mode and immediately begin advancing — set by
   * `PlansPage.vue` when it navigates here as the next step of a
   * plan-mode cascade (see `selectPlan`'s own doc comment). Read once, on
   * mount; `PlansPage` keys this component by run id so a new cascade
   * step is always a fresh instance, not a prop update on a reused one.
   */
  startInPlanMode?: boolean;
}>();
const emit = defineEmits<{
  /** Fired when this run finishes on its own while in "plan" mode — see `selectPlan`. */
  "plan-run-done": [];
}>();
const runId = computed(() => props.runId);
const router = useRouter();

const runQuery = useWorkflowRunQuery(runId);
const run = computed(() => runQuery.data.value?.run);
const logsQuery = useWorkflowRunLogsQuery(runId);
const logs = computed(() => logsQuery.data.value?.logs ?? []);
const logItems = computed(() => groupLogs(logs.value));
const stepsQuery = useWorkflowRunStepsQuery(runId);
// Config-defined (plan file) workflows are re-read from disk fresh on
// every real `advance`/`GET .../steps` call server-side — reloading this
// page is what picks up an on-disk edit; no client-side polling needed.
const steps = computed(() => stepsQuery.data.value?.steps ?? []);
const advanceMutation = useAdvanceWorkflowRunMutation();
const cancelMutation = useCancelWorkflowRunMutation();
useRunEvents(runId);

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
  () => advanceMutation.isPending.value || run.value?.is_advancing === true,
);

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

requestNotificationPermission();

const extraPrompt = ref("");

/**
 * The single "keep this run moving" action — a plain advance in most
 * states, and what used to be a separate "Retry" button when `failed`
 * (there's no meaningful difference at the API level: both are just a
 * POST /advance, optionally carrying `revert`/`skip`/an extra prompt — see
 * the ask to fold "retry" into one universal "continue"/Play action).
 */
function continueRun(options: { revert?: boolean; skip?: boolean } = {}) {
  unlockAudio();
  advanceMutation.mutate({
    runId: runId.value,
    ...options,
    extraPrompt: extraPrompt.value.trim() || undefined,
  });
  extraPrompt.value = "";
}

/**
 * Whether a plain (no revert/skip/extraPrompt) advance makes sense right
 * now — same states the Play button itself allows (see its `:disabled`
 * above). Auto-continue deliberately never fires for a `failed` run: that
 * state's Continue/Revert/Skip choice is the user's to make, not something
 * to loop past automatically.
 */
const canAutoAdvance = computed(
  () => run.value !== undefined && run.value.status !== "failed" && run.value.status !== "done",
);

/**
 * The VCR-style playback mode, one of four (radio-style — exactly one
 * active), switched by clicking the corresponding button:
 * - `stop`: idle; clicking Stop while a step is in flight also cancels it.
 * - `step`: manual, one step per click (today's plain "Continue"/Play).
 * - `workflow`: auto-continue through this run's own remaining steps
 *   (stops on its own once the run reaches a terminal state).
 * - `plan`: same auto-continue, plus once *this* run reaches `done`,
 *   automatically starts the next plan file (alphabetically, in the same
 *   folder) in `plan` mode too — see `selectPlan` and the `plan-run-done`
 *   emit `PlansPage.vue` listens for.
 *
 * Not reset automatically when a chain stops (on failure, or naturally on
 * `done`) — it stays as a record of what was last requested, same as a
 * real VCR's mode indicator doesn't un-press itself when the tape runs out.
 */
const autoMode = ref<"stop" | "step" | "workflow" | "plan">("stop");

function selectStop() {
  autoMode.value = "stop";
  if (isAdvancing.value) {
    cancelMutation.mutate(runId.value);
  }
}

function selectStep() {
  autoMode.value = "step";
  if (!isAdvancing.value && run.value?.status !== "done") {
    continueRun();
  }
}

/** Auto-continue deliberately never *kicks off* from a `failed` run: see `canAutoAdvance`. */
function selectWorkflow() {
  autoMode.value = "workflow";
  if (!isAdvancing.value && canAutoAdvance.value) {
    continueRun();
  }
}

/**
 * Same kick-off as `selectWorkflow` — the plan-folder cascade itself
 * happens later, in the status watcher below (once this run reaches
 * `done`) and in `PlansPage.vue` (which owns "what's the next file").
 */
function selectPlan() {
  autoMode.value = "plan";
  if (!isAdvancing.value && canAutoAdvance.value) {
    continueRun();
  }
}

// `run` isn't loaded yet at setup time — `canAutoAdvance`/`selectPlan`'s
// kick-off both depend on it, so wait for the first real value rather
// than calling `selectPlan()` here directly (which would see `run.value
// === undefined` and silently no-op).
if (props.startInPlanMode) {
  if (run.value) {
    // Already cached (e.g. a query revisit) — no "change" would ever fire below.
    selectPlan();
  } else {
    watch(run, (r) => { if (r) selectPlan(); }, { once: true });
  }
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

// Chains further plain advances for as long as each one succeeds — same
// "keep going while success" contract as the CLI's own advance loop (see
// `new-workflows/cli/advance-loop.ts`): `lib` never decides to continue on
// its own, so something has to. Watches the mutation's pending/settled
// transition (rather than a per-call `onSuccess`) so this covers *every*
// advance that finishes — a manual click, a Retry, or a previous link in
// this same chain — not just calls this function itself made.
watch(
  () => advanceMutation.isPending.value,
  (pending, wasPending) => {
    if (!wasPending || pending) return;
    if (autoMode.value !== "workflow" && autoMode.value !== "plan") return;
    const outcome = advanceMutation.data.value as { status?: string } | undefined;
    if (outcome?.status === "success") {
      continueRun();
    }
  },
);

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

// Sound + desktop notification when a run stops *on its own* — worth
// knowing about without keeping the tab in view, especially with
// auto-continue running unattended. Only reacts to a live transition
// witnessed while on this page (guarded by `previousStatus === undefined`
// below) — opening an already-finished run's history page shouldn't
// replay its outcome.
watch(
  () => run.value?.status,
  (status, previousStatus) => {
    if (!status || status === previousStatus || previousStatus === undefined) return;
    if (status === "done") {
      playSuccessBell();
      notify("Workflow finished", `Run ${runId.value} completed successfully.`);
      if (autoMode.value === "plan") {
        emit("plan-run-done");
      }
    } else if (status === "failed") {
      playFailureQuack();
      notify("Workflow failed", failureMessage.value);
    }
  },
);
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
</style>
