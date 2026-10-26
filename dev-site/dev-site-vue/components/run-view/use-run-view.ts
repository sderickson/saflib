import { computed, onMounted, onUnmounted, reactive, ref, type ComponentPublicInstance } from "vue";
import { useRouter } from "vue-router";
import {
  useWorkflowRunQuery,
  useWorkflowRunStepsQuery,
  useWorkflowRunMessagesQuery,
  useWorkflowRunStepTreeQuery,
  useWorkflowStepsQuery,
  useCreateWorkflowRunMutation,
  useSendFreeformAgentMessageMutation,
  useGotoWorkflowRunMutation,
  usePreviewWorkflowDiffMutation,
  usePreviewWorkflowRunDiffMutation,
} from "../../requests/workflows-queries.ts";
import { useRunEvents } from "../../requests/use-run-events.ts";
import { useRunOrchestrator } from "../../run-orchestrator.ts";
import { isRunAdvancingForDisplay } from "../../run-client-advancing.ts";
import { runStatusVisual } from "../../run-status-visual.ts";
import type { PreviewFile } from "../../preview-file-tree.ts";
import {
  getVolume,
  setVolume,
  isMuted,
  toggleMuted,
  unlockAudio,
} from "../../run-alerts.ts";
import { getAgentCli } from "../../agent-settings.ts";
import { formatClockSummary, summarizeRunTimings } from "../../plan-run-stats.ts";
import { isMechanicalPreviewFailure } from "@saflib/new-workflows/preview/preview-failures";
import {
  buildSidebarItems,
  displayStepNumber,
  flattenStepTree,
  resolveFailureMessage,
  shouldShowPreviewPane,
  stepStatusClassNames,
  volumeIconName,
} from "./run-view.logic.ts";
import { useRunViewLogs } from "./use-run-view-logs.ts";

export type RunViewProps = {
  workflowRef: string;
  runId?: string;
  baseRunIds?: string[];
};

export function useRunView(props: RunViewProps) {
  const runId = computed(() => props.runId);
  const baseRunIds = computed(() => props.baseRunIds ?? []);
  const router = useRouter();
  const orchestrator = useRunOrchestrator();

  const runQuery = useWorkflowRunQuery(runId);
  const run = computed(() => runQuery.data.value?.run);
  const logs = useRunViewLogs(runId);

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

  const runStepsQuery = useWorkflowRunStepsQuery(runId);
  const workflowStepsQuery = useWorkflowStepsQuery(() =>
    runId.value ? undefined : props.workflowRef,
  );
  const steps = computed(
    () =>
      (runId.value
        ? runStepsQuery.data.value?.steps
        : workflowStepsQuery.data.value?.steps) ?? [],
  );
  useRunEvents(runId);

  const messagesQuery = useWorkflowRunMessagesQuery(runId);
  const sidebarItems = computed(() =>
    buildSidebarItems(steps.value, messagesQuery.data.value?.messages ?? []),
  );

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

  const createRunMutation = useCreateWorkflowRunMutation();
  function initWorkflow() {
    createRunMutation.mutate({
      id: props.workflowRef,
      body: { input: {}, mode: "run", agentConfig: { cli: getAgentCli() } },
    });
  }

  const resetConfirmOpen = ref(false);
  const gotoModalOpen = ref(false);
  const gotoMutation = useGotoWorkflowRunMutation();
  const stepTreeQuery = useWorkflowRunStepTreeQuery(runId, gotoModalOpen);
  const flatStepTree = computed(() => flattenStepTree(stepTreeQuery.data.value?.steps));

  function openGotoModal() {
    gotoMutation.reset();
    gotoModalOpen.value = true;
  }

  function selectGotoPath(path: string) {
    if (!runId.value) return;
    gotoMutation.mutate(
      { runId: runId.value, path },
      { onSuccess: () => { gotoModalOpen.value = false; } },
    );
  }

  const agentMessageMutation = useSendFreeformAgentMessageMutation();
  const extraPrompt = ref("");
  const directMessage = ref("");

  /** The driver's latest outcome, when it's about this run. */
  const ownOutcome = computed(() => {
    const outcome = orchestrator.lastOutcome.value;
    return outcome && outcome.run_id === runId.value ? outcome : undefined;
  });

  const pauseMessage = computed(
    () => ownOutcome.value?.message || "Paused. Review the result, then continue.",
  );

  const isAdvancing = computed(() => {
    const id = runId.value;
    if (!id) return false;
    return isRunAdvancingForDisplay(id, run.value?.is_advancing === true, {
      activeRunId: orchestrator.activeRunId.value,
      advancePending: orchestrator.drivePending.value,
      agentMessagePendingRunId: agentMessageMutation.isPending.value
        ? agentMessageMutation.variables.value?.runId
        : undefined,
    });
  });

  const showPreviewPane = computed(() =>
    shouldShowPreviewPane(
      runId.value,
      run.value?.status,
      Boolean(run.value),
      isAdvancing.value,
    ),
  );

  const isOtherRunActive = computed(
    () =>
      orchestrator.activeRunId.value !== undefined &&
      orchestrator.activeRunId.value !== runId.value,
  );
  const isActiveRun = computed(() => orchestrator.activeRunId.value === runId.value);
  const statusVisual = computed(() =>
    runStatusVisual(
      run.value ? { ...run.value, is_advancing: isAdvancing.value } : undefined,
    ),
  );
  const wasCancelled = computed(() => run.value?.was_cancelled === true);
  const autoMode = computed(() => orchestrator.autoMode.value);

  function stepStatusClasses(step: { index: number }) {
    return stepStatusClassNames(
      step.index,
      run.value?.current_step_index,
      logs.currentStepIndex.value,
    );
  }

  /**
   * Why the agent can't take a direct message right now, if it can't. One
   * agent turn at a time: not while this run is advancing (a step or an
   * earlier message), and not while any other run is being driven (a
   * workflow/plan chain holds `activeRunId` across its steps).
   */
  const agentMessageBlockedReason = computed((): string | undefined => {
    if (!runId.value) return "No run yet";
    if (isOtherRunActive.value) return "Another workflow is running";
    if (isAdvancing.value) return "Agent is running";
    return undefined;
  });

  function sendDirectMessage() {
    const message = directMessage.value.trim();
    if (!message || agentMessageBlockedReason.value) return;
    unlockAudio();
    // Clear right away — the request stays open for the whole agent turn.
    // Put the text back if it didn't go through (unless they've typed more).
    directMessage.value = "";
    const restore = () => {
      if (!directMessage.value) directMessage.value = message;
    };
    agentMessageMutation.mutate(
      { runId: runId.value!, message },
      {
        onSuccess: (outcome) => {
          if (outcome.status !== "ok") restore();
        },
        onError: restore,
      },
    );
  }

  function continueRun(options: { revert?: boolean; skip?: boolean } = {}) {
    orchestrator.continueRun(runId.value!, props.workflowRef, {
      ...options,
      extraPrompt: extraPrompt.value.trim() || undefined,
    });
    extraPrompt.value = "";
  }

  function confirmReset() {
    resetConfirmOpen.value = false;
    if (runId.value) {
      orchestrator.selectStop(runId.value, isAdvancing.value && isActiveRun.value);
    }
    initWorkflow();
  }

  function openReflection() {
    if (!run.value?.base_commit_hash) return;
    router.push({
      path: "/checkout",
      query: {
        compare: run.value.base_commit_hash,
        // Pin the end so later commits on the branch don't leak in.
        ...(run.value.completion_hash ? { head: run.value.completion_hash } : {}),
        reflection: runId.value,
      },
    });
  }

  const volume = ref(getVolume());
  const muted = ref(isMuted());
  function onVolumeChange(next: number) {
    setVolume(next);
    volume.value = getVolume();
  }
  function onToggleMute() {
    muted.value = toggleMuted();
  }
  const volumeIcon = computed(() => volumeIconName(muted.value, volume.value));

  const failureMessage = computed(() =>
    resolveFailureMessage(ownOutcome.value?.message, logs.logs.value),
  );

  const agentMessagePending = computed(() => agentMessageMutation.isPending.value);
  const agentMessageError = computed(() => {
    const data = agentMessageMutation.data.value;
    return (
      agentMessageMutation.error.value?.message ??
      (data?.status === "error" ? data.message : undefined)
    );
  });
  const createPending = computed(() => createRunMutation.isPending.value);
  const createError = computed(() => createRunMutation.error.value?.message);
  const cancelPending = computed(
    () => isActiveRun.value && orchestrator.cancelMutation.isPending.value,
  );
  const gotoPending = computed(() => gotoMutation.isPending.value);
  const gotoTreeLoading = computed(() => stepTreeQuery.isPending.value);
  const gotoTreeError = computed(() => stepTreeQuery.error.value?.message);
  const gotoError = computed(() => gotoMutation.error.value?.message);
  const logsLoadingOlder = computed(() => logs.logsQuery.isFetchingNextPage.value);
  const logsLoadingNewer = computed(() => logs.logsQuery.isFetchingPreviousPage.value);
  // Under the last loaded log — only meaningful when that's the newest one.
  const showRunningIndicator = computed(
    () => isAdvancing.value && !logs.logsQuery.hasPreviousPage.value,
  );

  const headerStepDisplay = computed(() => {
    const anchor = logs.logAnchor.value;
    if (anchor && "step" in anchor) return displayStepNumber(anchor.step);
    const viewport = logs.currentStepIndex.value;
    if (viewport !== undefined) return displayStepNumber(viewport);
    const cur = run.value?.current_step_index;
    if (cur === undefined) return undefined;
    const n = steps.value.length;
    if (n > 0 && cur >= n) return n;
    return displayStepNumber(cur);
  });

  function closePreview() {
    previewShown.value = false;
  }

  function openReset() {
    resetConfirmOpen.value = true;
  }

  function bindLogContainer(el: Element | ComponentPublicInstance | null) {
    const node =
      el instanceof HTMLElement ? el : (el as ComponentPublicInstance | null)?.$el;
    logs.logContainer.value = node instanceof HTMLElement ? node : null;
  }

  return reactive({
    runId,
    run,
    runClock,
    statusVisual,
    steps,
    stepStatusClasses,
    logAnchor: logs.logAnchor,
    headerStepDisplay,
    currentStepIndex: logs.currentStepIndex,
    logContainer: logs.logContainer,
    logItems: logs.logItems,
    logsQuery: logs.logsQuery,
    logsLoadingOlder,
    logsLoadingNewer,
    showRunningIndicator,
    showStickyAgentInput: logs.showStickyAgentInput,
    showJumpToLatest: logs.showJumpToLatest,
    scrollToStep: logs.scrollToStep,
    scrollToMessage: logs.scrollToMessage,
    sidebarItems,
    returnToLiveLogs: logs.returnToLiveLogs,
    onLogScroll: logs.onScroll,
    logItemKey: logs.logItemKey,
    logItemStepIndex: logs.logItemStepIndex,
    logItemSeq: logs.logItemSeq,
    isLastAgentInput: logs.isLastAgentInput,
    showPreviewPane,
    previewShown,
    previewPending,
    previewError,
    previewDataReady,
    previewMechanicalFailures,
    previewFiles,
    openPreview,
    closePreview,
    createRunMutation,
    initWorkflow,
    orchestrator,
    isAdvancing,
    isOtherRunActive,
    isActiveRun,
    autoMode,
    wasCancelled,
    pauseMessage,
    failureMessage,
    extraPrompt,
    directMessage,
    agentMessageMutation,
    agentMessagePending,
    agentMessageError,
    agentMessageBlockedReason,
    createPending,
    createError,
    cancelPending,
    gotoPending,
    gotoTreeLoading,
    gotoTreeError,
    gotoError,
    sendDirectMessage,
    continueRun,
    resetConfirmOpen,
    openReset,
    confirmReset,
    openReflection,
    gotoModalOpen,
    gotoMutation,
    stepTreeQuery,
    flatStepTree,
    openGotoModal,
    selectGotoPath,
    selectStop: () => orchestrator.selectStop(runId.value!, isAdvancing.value),
    selectStep: () => orchestrator.selectStep(runId.value!, props.workflowRef),
    selectWorkflow: () => orchestrator.selectWorkflow(runId.value!, props.workflowRef),
    selectPlan: () => orchestrator.selectPlan(runId.value!, props.workflowRef),
    volume,
    muted,
    volumeIcon,
    onVolumeChange,
    onToggleMute,
    bindLogContainer,
  });
}
