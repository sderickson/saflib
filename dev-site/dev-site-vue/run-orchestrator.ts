import { effectScope, ref, watch, type EffectScope, type Ref } from "vue";
import { useRouter } from "vue-router";
import {
  useAdvanceWorkflowRunMutation,
  useCancelWorkflowRunMutation,
  useCreateWorkflowRunMutation,
  useWorkflowRunLogsQuery,
} from "./requests/workflows-queries.ts";
import { useRepoFiles, useCheckout } from "./requests/queries.ts";
import {
  plansPrefix,
  groupPlanFiles,
  findNextPlanFile,
  parsePlanFilePath,
  planFileHref,
} from "./plan-files.ts";
import {
  unlockAudio,
  playSuccessBell,
  playFailureQuack,
  requestNotificationPermission,
  notify,
} from "./run-alerts.ts";

export type AutoMode = "stop" | "step" | "workflow" | "plan";

export interface RunOrchestrator {
  /** The one run currently being driven (advanced and/or auto-continued), if any — only one at a time system-wide. */
  activeRunId: Readonly<Ref<string | undefined>>;
  /** The VCR mode last selected — meaningful only for `activeRunId`'s own run; kept even once a chain stops (see `selectStep`'s doc comment). */
  autoMode: Readonly<Ref<AutoMode>>;
  /** The shared advance mutation — its `.isPending`/`.data` reflect whichever run is currently `activeRunId`. */
  advanceMutation: ReturnType<typeof useAdvanceWorkflowRunMutation>;
  /** The shared cancel mutation. */
  cancelMutation: ReturnType<typeof useCancelWorkflowRunMutation>;
  /** Raw one-off advance — used by RunView's failed-run recovery (Revert & Continue / Skip Step), outside of mode selection. */
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
 * everything — state, mutations, watchers — alive for the rest of the
 * app's lifetime, independent of whichever page/component happens to be
 * mounted afterward. This is what makes the auto-continue chain and the
 * "play current plan" cascade survive navigating away from the run that
 * kicked them off (see the bug report this fixes: the whole mechanism used
 * to live inside `RunView.vue`'s own local script state, and died with it
 * the moment you navigated to a different workflow file).
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
  const activeRunId = ref<string | undefined>(undefined);
  /** The workflow/plan-file path behind `activeRunId` — needed for the plan-cascade's "what's the next phase" lookup; threaded in by the caller (`RunView` always has it via its own `workflowRef` prop) rather than fetched separately. */
  const activeWorkflowRef = ref<string | undefined>(undefined);
  const autoMode = ref<AutoMode>("stop");

  const advanceMutation = useAdvanceWorkflowRunMutation();
  const cancelMutation = useCancelWorkflowRunMutation();
  const createRunMutation = useCreateWorkflowRunMutation();
  // Only for the failed-run message's log-search fallback (see
  // `failureMessage`) — not used to detect status transitions, so it isn't
  // subject to the race a separate run-status query would be (see below).
  const activeLogsQuery = useWorkflowRunLogsQuery(activeRunId);

  // Kept live for the whole app's lifetime so the plan-cascade can look up
  // "what's the next phase file" without depending on `PlansPage` being
  // mounted at the moment a run finishes.
  const { data: checkout } = useCheckout("");
  const filesQuery = useRepoFiles("", () => ({
    ref: "HEAD",
    prefix: plansPrefix(checkout.value?.product_root),
  }));

  function continueRun(
    runId: string,
    workflowRef: string,
    options: { revert?: boolean; skip?: boolean; extraPrompt?: string } = {},
  ): void {
    unlockAudio();
    activeRunId.value = runId;
    activeWorkflowRef.value = workflowRef;
    advanceMutation.mutate({ runId, ...options });
  }

  function isThisRunInFlight(runId: string): boolean {
    return activeRunId.value === runId && advanceMutation.isPending.value;
  }

  /**
   * `isAdvancing` is the caller's own view of whether *this* run is
   * genuinely in progress — combining the orchestrator's own pending
   * mutation with the run's server-reported `is_advancing`, since a page
   * reload (or simply never having clicked anything yet) can find a run
   * already advancing server-side with no orchestrator engagement at all;
   * Stop still needs to cancel that. Claims the run as active so the
   * cancel is attributed correctly, even if the orchestrator wasn't
   * already tracking it.
   */
  function selectStop(runId: string, isAdvancing: boolean): void {
    autoMode.value = "stop";
    if (isAdvancing) {
      activeRunId.value = runId;
      cancelMutation.mutate(runId);
    }
  }

  function selectStep(runId: string, workflowRef: string): void {
    autoMode.value = "step";
    if (!isThisRunInFlight(runId)) continueRun(runId, workflowRef);
  }

  function selectWorkflow(runId: string, workflowRef: string): void {
    autoMode.value = "workflow";
    if (!isThisRunInFlight(runId)) continueRun(runId, workflowRef);
  }

  /** The plan-folder cascade itself happens later, once this call's own outcome says the run reached `done` — see the settle-watch below. */
  function selectPlan(runId: string, workflowRef: string): void {
    autoMode.value = "plan";
    if (!isThisRunInFlight(runId)) continueRun(runId, workflowRef);
  }

  function failureMessage(outcomeMessage: string | undefined): string {
    if (outcomeMessage) return outcomeMessage;
    const logs = activeLogsQuery.data.value?.logs ?? [];
    const lastError = [...logs].reverse().find((l) => l.level === "error");
    return lastError?.content ?? "Failed — no error details available.";
  }

  async function cascadeToNextPhase(finishedRunId: string, workflowRef: string): Promise<void> {
    const prefix = plansPrefix(checkout.value?.product_root);
    const parsed = parsePlanFilePath(workflowRef, prefix);
    const files = filesQuery.data.value?.files ?? [];
    const groups = groupPlanFiles(files, prefix);
    const next = parsed ? findNextPlanFile(groups, parsed.folder, parsed.fileName) : undefined;
    if (!parsed || !next) {
      // Nothing left to cascade to — release the run so other workflows can run.
      if (activeRunId.value === finishedRunId) activeRunId.value = undefined;
      return;
    }
    createRunMutation.mutate(
      { id: next.path, body: { input: {}, mode: "run", agentConfig: { cli: "claude-agent" } } },
      {
        onSuccess: async (data) => {
          // Keep driving, uninterrupted — same "plan" mode, new run — and
          // follow along so the person sees the cascade happen.
          continueRun(data.run.id, next.path);
          await router.push(planFileHref(parsed.folder, next.name));
        },
        onError: () => {
          if (activeRunId.value === finishedRunId) activeRunId.value = undefined;
        },
      },
    );
  }

  // The single source of truth for "what just happened" — chaining further
  // advances, sound/notification, and the plan-cascade all key off THIS
  // call's own settled outcome (`advanceMutation.data.value`), not a
  // separately-fetched run record. A separate "watch the run's own status
  // field" query was tried and discarded: that query's refetch (however
  // triggered) can resolve — and flip its `status` — before Vue's reactive
  // `data` ref for THIS mutation has propagated its own settled value to
  // observers, so reading `advanceMutation.data.value` from a watcher on a
  // *different* reactive source raced and sometimes lost. Watching this
  // mutation's own `isPending` transition and reading `.data.value` in the
  // very same callback has no such race — it's the same settlement, not a
  // side effect of it.
  watch(
    () => advanceMutation.isPending.value,
    (pending, wasPending) => {
      if (!wasPending || pending) return;
      const runId = activeRunId.value;
      if (!runId) return;
      const outcome = advanceMutation.data.value as
        | { status?: string; message?: string }
        | undefined;
      if (!outcome) return;

      if (outcome.status === "success") {
        if (autoMode.value === "workflow" || autoMode.value === "plan") {
          const workflowRef = activeWorkflowRef.value;
          if (workflowRef) continueRun(runId, workflowRef);
        }
        return;
      }

      if (outcome.status === "done") {
        playSuccessBell();
        notify("Workflow finished", `Run ${runId} completed successfully.`);
        const workflowRef = activeWorkflowRef.value;
        if (autoMode.value === "plan" && workflowRef) {
          void cascadeToNextPhase(runId, workflowRef);
          return;
        }
        activeRunId.value = undefined;
        return;
      }

      // Any other outcome ("error", or an unrecognized status) — the step failed.
      playFailureQuack();
      notify("Workflow failed", failureMessage(outcome.message));
      activeRunId.value = undefined;
    },
  );

  return {
    activeRunId,
    autoMode,
    advanceMutation,
    cancelMutation,
    continueRun,
    selectStop,
    selectStep,
    selectWorkflow,
    selectPlan,
  };
}
