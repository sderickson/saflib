import { computed, effectScope, ref, watch, type EffectScope, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import {
  flattenRunLogPages,
  useCancelWorkflowRunMutation,
  useDriveWorkflowRunMutation,
  useStopWorkflowDriveMutation,
  useWorkflowDriveQuery,
  useWorkflowRunLogsQuery,
  type DriveMode,
  type WorkflowDrive,
} from "./requests/workflows-queries.ts";
import { useCheckout } from "./requests/queries.ts";
import { plansPrefix, parsePlanFilePath, planFileHref } from "./plan-files.ts";
import {
  unlockAudio,
  playSuccessBell,
  playFailureQuack,
  requestNotificationPermission,
  notify,
} from "./run-alerts.ts";

export type AutoMode = "stop" | "step" | "workflow" | "plan";

export type DriveOutcome = NonNullable<WorkflowDrive["last_outcome"]>;

export interface RunOrchestrator {
  /** The one run currently being driven, if any — only one at a time system-wide. */
  activeRunId: Readonly<Ref<string | undefined>>;
  /** The driver's mode (or the one just clicked) — meaningful only for `activeRunId`'s own run; kept once a drive stops. */
  autoMode: Readonly<Ref<AutoMode>>;
  /** Whether a step of `activeRunId` is running, or about to. */
  drivePending: Readonly<Ref<boolean>>;
  /** The latest step outcome the driver reported, for whichever run it was. */
  lastOutcome: Readonly<Ref<DriveOutcome | undefined>>;
  /** The shared cancel mutation. */
  cancelMutation: ReturnType<typeof useCancelWorkflowRunMutation>;
  /** One-off advance in the current mode — used by RunView's failed-run recovery (Revert & Continue / Skip Step), outside of mode selection. */
  continueRun: (
    runId: string,
    workflowRef: string,
    options?: { revert?: boolean; skip?: boolean; extraPrompt?: string },
  ) => void;
  selectStop: (runId: string, isAdvancing: boolean) => void;
  selectStep: (runId: string, workflowRef: string) => void;
  selectWorkflow: (runId: string, workflowRef: string) => void;
  selectPlan: (runId: string, workflowRef: string) => void;
}

let scope: EffectScope | undefined;
let instance: RunOrchestrator | undefined;

/**
 * Lazily created once, the first time any component calls this — by then
 * we're still inside *a* component's setup call stack, so the
 * injection-based composables below (`useRouter`, and `@tanstack/vue-query`
 * composables via `useQueryClient`) resolve against that component's real
 * provided router/query client. `effectScope(true)` (detached) then keeps
 * its state and watchers alive for the rest of the app's lifetime,
 * independent of whichever page/component happens to be mounted, so
 * alerts and following a plan cascade work from any page. The chaining
 * itself happens on the server (see `createOrchestrator`).
 */
export function useRunOrchestrator(): RunOrchestrator {
  if (instance) return instance;
  scope = effectScope(true);
  instance = scope.run(() => createOrchestrator())!;
  return instance;
}

/** Test-only: a module-level singleton otherwise leaks state (and a stale test-run QueryClient/router) across test files under this suite's `isolate: false`. */
export function __resetRunOrchestratorForTests(): void {
  scope?.stop();
  scope = undefined;
  instance = undefined;
}

function createOrchestrator(): RunOrchestrator {
  requestNotificationPermission();
  const router = useRouter();
  const queryClient = useQueryClient();

  // The server drives runs (`POST /runs/{id}/drive`): it chains steps and
  // starts the next phase file on its own, so a run keeps going while this
  // tab is closed, asleep, or throttled in the background. This side only
  // asks it to, and follows along through `GET /drive`.
  const driveQuery = useWorkflowDriveQuery();
  const driveMutation = useDriveWorkflowRunMutation();
  const stopMutation = useStopWorkflowDriveMutation();
  const cancelMutation = useCancelWorkflowRunMutation();
  const drive = computed(() => driveQuery.data.value?.drive);

  // What was just clicked, until the server's answer arrives.
  const requested = ref<{ runId: string; mode: AutoMode } | undefined>();
  // Stop clicked while a drive request was still on its way.
  let stopWhenStarted = false;

  const activeRunId = computed(() => {
    if (requested.value && requested.value.mode !== "stop") return requested.value.runId;
    return drive.value?.active ? drive.value.run_id : undefined;
  });
  const autoMode = computed<AutoMode>(() => requested.value?.mode ?? drive.value?.mode ?? "stop");
  const drivePending = computed(
    () => driveMutation.isPending.value || drive.value?.active === true,
  );
  const lastOutcome = computed(() => drive.value?.last_outcome);

  // Only for the failed-run message's log-search fallback (see `failureMessage`).
  const outcomeLogsQuery = useWorkflowRunLogsQuery(() => lastOutcome.value?.run_id);
  const { data: checkout } = useCheckout("");

  function requestDrive(
    runId: string,
    mode: DriveMode,
    options: { revert?: boolean; skip?: boolean; extraPrompt?: string } = {},
  ): void {
    unlockAudio();
    requested.value = { runId, mode };
    driveMutation.mutate(
      { runId, mode, ...options },
      {
        onError: (error) => {
          playFailureQuack();
          notify("Couldn't start the run", error.message);
        },
        onSettled: () => {
          if (stopWhenStarted) {
            stopWhenStarted = false;
            stopDrive(runId);
            return;
          }
          if (requested.value?.runId === runId) requested.value = undefined;
        },
      },
    );
  }

  function stopDrive(runId: string): void {
    requested.value = { runId, mode: "stop" };
    stopMutation.mutate(undefined, {
      onSettled: () => {
        if (requested.value?.runId === runId) requested.value = undefined;
      },
    });
  }

  function continueRun(
    runId: string,
    _workflowRef: string,
    options: { revert?: boolean; skip?: boolean; extraPrompt?: string } = {},
  ): void {
    const mode = autoMode.value === "workflow" || autoMode.value === "plan" ? autoMode.value : "step";
    requestDrive(runId, mode, options);
  }

  /**
   * `isAdvancing` is the caller's own view of whether *this* run is
   * genuinely in progress — including a run advancing server-side without
   * the driver (e.g. from the CLI); Stop still needs to cancel that.
   */
  function selectStop(runId: string, isAdvancing: boolean): void {
    if (driveMutation.isPending.value && requested.value?.runId === runId) {
      requested.value = { runId, mode: "stop" };
      stopWhenStarted = true;
      return;
    }
    if (drive.value?.active && drive.value.run_id === runId) {
      stopDrive(runId);
      return;
    }
    if (isAdvancing) cancelMutation.mutate(runId);
  }

  function selectStep(runId: string, _workflowRef: string): void {
    requestDrive(runId, "step");
  }

  function selectWorkflow(runId: string, _workflowRef: string): void {
    requestDrive(runId, "workflow");
  }

  function selectPlan(runId: string, _workflowRef: string): void {
    requestDrive(runId, "plan");
  }

  function failureMessage(outcomeMessage: string | undefined): string {
    if (outcomeMessage) return outcomeMessage;
    const logs = flattenRunLogPages(outcomeLogsQuery.data.value?.pages);
    const lastError = [...logs].reverse().find((l) => l.level === "error");
    return lastError?.content ?? "Failed — no error details available.";
  }

  // Sound and notifications, once per new outcome. The first answer from
  // the server only sets the baseline, so a reload doesn't replay the last
  // outcome.
  let seenSeq: number | undefined;
  watch(
    () => driveQuery.data.value,
    (data) => {
      if (!data) return;
      const outcome = data.drive?.last_outcome;
      if (seenSeq === undefined) {
        seenSeq = outcome?.seq ?? 0;
        return;
      }
      if (!outcome || outcome.seq <= seenSeq) return;
      seenSeq = outcome.seq;

      // The step changed the run (status, current step); show that now
      // rather than on the next event-driven refresh.
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", outcome.run_id] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs"] });

      if (outcome.status === "done") {
        playSuccessBell();
        notify("Workflow finished", `Run ${outcome.run_id} completed successfully.`);
      } else if (outcome.status === "awaiting_user") {
        notify("Paused for review", outcome.message ?? "Review the result, then continue.");
      } else if (outcome.status !== "success") {
        playFailureQuack();
        notify("Workflow failed", failureMessage(outcome.message));
      }
    },
    { immediate: true },
  );

  // Follow a plan cascade: when the driver moves on to the next phase file
  // and this tab is showing the one it finished, show the new one.
  watch(
    () => drive.value && { runId: drive.value.run_id, ref: drive.value.workflow_ref },
    (next, previous) => {
      if (!next || !previous || next.runId === previous.runId) return;
      const prefix = plansPrefix(checkout.value?.product_root);
      const from = parsePlanFilePath(previous.ref, prefix);
      const to = parsePlanFilePath(next.ref, prefix);
      if (!from || !to) return;
      if (router.currentRoute.value.path !== planFileHref(from.folder, from.fileName)) return;
      void router.push(planFileHref(to.folder, to.fileName));
    },
  );

  return {
    activeRunId,
    autoMode,
    drivePending,
    lastOutcome,
    cancelMutation,
    continueRun,
    selectStop,
    selectStep,
    selectWorkflow,
    selectPlan,
  };
}
