import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import createClient from "openapi-fetch";
import type {
  paths,
  NewWorkflowsResponseBody,
  NewWorkflowsRequestBody,
} from "@saflib/new-workflows-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";

/**
 * Same-origin — the workflows API is mounted into dev-site-http itself.
 * An empty `baseUrl` resolves fine in a real browser (relative to the
 * current page), but `openapi-fetch` builds requests via `new Request()`,
 * which — unlike browser `fetch` — cannot resolve a bare relative path
 * (throws `Failed to parse URL`), including under Node/undici in tests.
 * Using the literal current origin (not `@saflib/links`' `getHost`, which
 * strips the current subdomain to find the *root* domain — wrong here,
 * since this stays on dev-site's own host) works in both.
 */
function createWorkflowsClient() {
  const baseUrl = typeof document !== "undefined" ? document.location.origin : "";
  return createClient<paths>({
    baseUrl,
    credentials: "include",
    fetch: (request) => {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf_token="))
        ?.split("=")[1];
      if (csrfToken) {
        request.headers.set("X-CSRF-Token", csrfToken);
      }
      const method = request.method.toUpperCase();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        request.headers.set("X-Requested-With", "XMLHttpRequest");
      }
      return fetch(request);
    },
  });
}

export function useWorkflowsQuery() {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listWorkflows"][200], TanstackError>({
    queryKey: ["new-workflows", "workflows"],
    queryFn: () => handleClientMethod(client.GET("/api/workflows", {})),
  });
}

export function useCreateWorkflowRunMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<
    NewWorkflowsResponseBody["createWorkflowRun"][201],
    TanstackError,
    { id: string; body: NewWorkflowsRequestBody["createWorkflowRun"] }
  >({
    mutationFn: ({ id, body }) =>
      handleClientMethod(
        client.POST("/api/workflows/{id}/runs", { params: { path: { id } }, body }),
      ),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run"] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs", id] });
    },
  });
}

export function useWorkflowRunsQuery(id: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listWorkflowRuns"][200], TanstackError>({
    queryKey: ["new-workflows", "workflow-runs", id],
    enabled: () => Boolean(toValue(id)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/workflows/{id}/runs", { params: { path: { id: toValue(id)! } } }),
      ),
  });
}

export function useWorkflowRunQuery(runId: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["getWorkflowRun"][200], TanstackError>({
    queryKey: ["new-workflows", "run", runId],
    enabled: () => Boolean(toValue(runId)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}", { params: { path: { runId: toValue(runId)! } } }),
      ),
  });
}

export function useWorkflowRunLogsQuery(runId: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listWorkflowRunLogs"][200], TanstackError>({
    queryKey: ["new-workflows", "run-logs", runId],
    enabled: () => Boolean(toValue(runId)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}/logs", { params: { path: { runId: toValue(runId)! } } }),
      ),
  });
}

export function useWorkflowRunStepsQuery(runId: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["getWorkflowRunSteps"][200], TanstackError>({
    queryKey: ["new-workflows", "run-steps", runId],
    enabled: () => Boolean(toValue(runId)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}/steps", { params: { path: { runId: toValue(runId)! } } }),
      ),
  });
}

export function usePlansQuery() {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["listPlans"][200], TanstackError>({
    queryKey: ["new-workflows", "plans"],
    queryFn: () => handleClientMethod(client.GET("/api/plans", {})),
  });
}

export function useCreatePlanMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<
    NewWorkflowsResponseBody["createPlan"][201],
    TanstackError,
    NewWorkflowsRequestBody["createPlan"]
  >({
    mutationFn: (body) => handleClientMethod(client.POST("/api/plans", { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "plans"] });
    },
  });
}

export interface AdvanceWorkflowRunVariables {
  runId: string;
  /** Discard uncommitted changes in the run's repo before retrying the current step. */
  revert?: boolean;
  /** Skip the current step entirely (commits whatever's dirty) instead of running it. */
  skip?: boolean;
  /** Prepended to whatever prompt this step call sends the agent. */
  extraPrompt?: string;
}

export function useAdvanceWorkflowRunMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<
    NewWorkflowsResponseBody["advanceWorkflowRun"][200],
    TanstackError,
    string | AdvanceWorkflowRunVariables
  >({
    mutationFn: (vars) => {
      const { runId, ...body } = typeof vars === "string" ? { runId: vars } : vars;
      return handleClientMethod(
        client.POST("/api/runs/{runId}/advance", { params: { path: { runId } }, body }),
      );
    },
    // Also on *mutate* (not just success) — the server marks a run
    // `is_advancing` synchronously as soon as the advance call starts, so
    // refetching `workflow-runs` right away (rather than only once the
    // whole step finishes, which can take minutes) is what makes a
    // spinner in the nav/plans page show up promptly instead of only
    // after the fact.
    onMutate: () => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs"] });
    },
    onSuccess: (_data, vars) => {
      const runId = typeof vars === "string" ? vars : vars.runId;
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", runId] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-logs", runId] });
      // Also every open `workflow-runs` (list-by-file) query — e.g.
      // `PlanNavIcon`'s and `PlansPage`'s own "most recent run" — not just
      // this run's own detail. Without this, retrying a failed run left
      // the nav icon and the plans page's inline run picker both showing
      // stale pre-retry status until something else happened to refetch
      // them; this call only knows the runId, not which workflow/file it
      // belongs to, so invalidate the whole `workflow-runs` key prefix
      // rather than one specific id.
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs"] });
    },
  });
}

/**
 * Stops the agent subprocess (if any) currently running for a run — the
 * in-flight `advance` request this races against resolves on its own once
 * the killed process exits (see `claude-agent.ts`); this call doesn't wait
 * for that, it only asks the process to stop.
 */
export function useCancelWorkflowRunMutation() {
  const client = createWorkflowsClient();
  return useMutation<NewWorkflowsResponseBody["cancelWorkflowRun"][200], TanstackError, string>({
    mutationFn: (runId) =>
      handleClientMethod(
        client.POST("/api/runs/{runId}/cancel", { params: { path: { runId } } }),
      ),
  });
}
