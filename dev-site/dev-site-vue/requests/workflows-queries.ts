import {
  useQuery,
  useQueries,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/vue-query";
import type { InfiniteData, QueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import createClient from "openapi-fetch";
import type {
  paths,
  NewWorkflowsResponseBody,
  NewWorkflowsRequestBody,
} from "@saflib/new-workflows-spec";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { createDevSiteClient } from "./queries.ts";

export type WorkflowRunLogsPage = NewWorkflowsResponseBody["listWorkflowRunLogs"][200];
export type WorkflowLogEntry = WorkflowRunLogsPage["logs"][number];

const RUN_LOGS_PAGE_SIZE = 100;

/**
 * API pages are newest-first; reverse each page then reverse page order so
 * the UI can render chronologically (oldest → newest, top → bottom).
 */
export function flattenRunLogPages(
  pages: WorkflowRunLogsPage[] | undefined,
): WorkflowLogEntry[] {
  if (!pages?.length) return [];
  return [...pages].reverse().flatMap((p) => [...p.logs].reverse());
}

/**
 * Pull rows newer than the current tip and prepend them onto page 0.
 * Prefer this over `invalidateQueries` once older pages are loaded —
 * a full refetch of page 0 with a sliding window would leave a gap
 * between the new tip and the still-cached older pages.
 */
export async function prependNewerRunLogs(
  queryClient: QueryClient,
  runId: string,
): Promise<void> {
  const prefix = ["new-workflows", "run-logs", runId] as const;
  const matches = queryClient.getQueriesData<
    InfiniteData<WorkflowRunLogsPage, LogPageParam>
  >({ queryKey: prefix });
  if (matches.length === 0) {
    await queryClient.invalidateQueries({ queryKey: prefix });
    return;
  }
  const client = createWorkflowsClient();
  for (const [key, existing] of matches) {
    const first = existing?.pages[0];
    // A sidebar jump leaves a gap above the loaded window. Filling it
    // belongs to scroll-down (`contiguous`), not this tip merge.
    if (!first || first.has_more_newer) continue;
    const tip = first.logs[0]?.created_at;
    if (!tip) {
      await queryClient.invalidateQueries({ queryKey: key });
      continue;
    }
    const fresh = await handleClientMethod(
      client.GET("/api/runs/{runId}/logs", {
        params: { path: { runId }, query: { since: tip, limit: 200 } },
      }),
    );
    if (fresh.logs.length === 0) continue;
    queryClient.setQueryData<InfiniteData<WorkflowRunLogsPage, LogPageParam>>(key, (old) => {
      if (!old?.pages.length) return old;
      const seen = new Set(old.pages.flatMap((p) => p.logs.map((l) => l.id)));
      const additions = fresh.logs.filter((l: WorkflowLogEntry) => !seen.has(l.id));
      if (additions.length === 0) return old;
      const pages = old.pages.map((p, i) =>
        i === 0 ? { ...p, logs: [...additions, ...p.logs] } : p,
      );
      return { ...old, pages };
    });
  }
}

/** Cursor for one logs page. `undefined` is the live tip, or a step anchor when one is selected. */
export type LogPageParam =
  | undefined
  | { before: string }
  | { since: string; contiguous: true };

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

/**
 * Each file's most recent run id, in the same order as `filePaths()` —
 * for chaining a preview onto earlier phases (see `PlansPage.vue`, which
 * is the only thing that knows "sibling plan files in this folder").
 * `undefined` entries mean that file has never been run.
 *
 * `queries` must be a `computed` (not a bare `() => …` getter):
 * `@tanstack/vue-query` ≤5.85 only `unref`s the option, so a function
 * becomes `function.map is not a function` at runtime (5.92+ accepts
 * either form). The docker image currently resolves to 5.85.x.
 */
export function useSiblingMostRecentRunIds(filePaths: () => string[]) {
  const client = createWorkflowsClient();
  const results = useQueries({
    queries: computed(() => {
      const paths = filePaths();
      const list = Array.isArray(paths) ? paths : [];
      return list.map((id) => ({
        queryKey: ["new-workflows", "workflow-runs", id] as const,
        queryFn: () =>
          handleClientMethod(
            client.GET("/api/workflows/{id}/runs", { params: { path: { id } } }),
          ),
      }));
    }),
  });
  return computed(() =>
    (Array.isArray(results.value) ? results.value : []).map(
      (r) => (r.data as NewWorkflowsResponseBody["listWorkflowRuns"][200] | undefined)?.runs[0]
        ?.id,
    ),
  );
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

export function useWorkflowRunLogsQuery(
  runId: MaybeRefOrGetter<string | undefined>,
  /** When set, the first page is the window starting at this step instead of the live tip. */
  anchorStep: MaybeRefOrGetter<number | undefined> = undefined,
) {
  const client = createWorkflowsClient();
  return useInfiniteQuery<
    WorkflowRunLogsPage,
    TanstackError,
    InfiniteData<WorkflowRunLogsPage, LogPageParam>,
    readonly unknown[],
    LogPageParam
  >({
    queryKey: computed(() => {
      const id = toValue(runId);
      const step = toValue(anchorStep);
      return step === undefined
        ? ["new-workflows", "run-logs", id]
        : ["new-workflows", "run-logs", id, step];
    }),
    enabled: () => Boolean(toValue(runId)),
    initialPageParam: undefined as LogPageParam,
    queryFn: ({ pageParam }) => {
      const step = toValue(anchorStep);
      const anchored = pageParam === undefined && step !== undefined;
      return handleClientMethod(
        client.GET("/api/runs/{runId}/logs", {
          params: {
            path: { runId: toValue(runId)! },
            query: {
              limit: RUN_LOGS_PAGE_SIZE,
              ...(pageParam && "before" in pageParam ? { before: pageParam.before } : {}),
              ...(pageParam && "since" in pageParam
                ? { since: pageParam.since, contiguous: true }
                : {}),
              ...(anchored ? { step_index: step } : {}),
            },
          },
        }),
      );
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.logs.length === 0) return undefined;
      // Newest-first page → last row is the oldest cursor for the next older page.
      return { before: lastPage.logs[lastPage.logs.length - 1]!.created_at };
    },
    getPreviousPageParam: (firstPage) => {
      if (!firstPage.has_more_newer || firstPage.logs.length === 0) return undefined;
      return { since: firstPage.logs[0]!.created_at, contiguous: true as const };
    },
  });
}

export function useLatestWorkflowRuns(filePaths: () => string[]) {
  const client = createWorkflowsClient();
  const results = useQueries({
    queries: computed(() => {
      const paths = filePaths();
      const list = Array.isArray(paths) ? paths : [];
      return list.map((id) => ({
        queryKey: ["new-workflows", "workflow-runs", id] as const,
        queryFn: () =>
          handleClientMethod(
            client.GET("/api/workflows/{id}/runs", { params: { path: { id } } }),
          ),
      }));
    }),
  });
  return computed(() => {
    const paths = filePaths();
    const list = Array.isArray(paths) ? paths : [];
    const rows = Array.isArray(results.value) ? results.value : [];
    const byPath = new Map<string, NewWorkflowsResponseBody["listWorkflowRuns"][200]["runs"][number]>();
    list.forEach((path, i) => {
      const run = (rows[i]?.data as NewWorkflowsResponseBody["listWorkflowRuns"][200] | undefined)
        ?.runs[0];
      if (run) byPath.set(path, run);
    });
    return byPath;
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

export function useWorkflowRunStepTreeQuery(
  runId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["getWorkflowRunStepTree"][200], TanstackError>({
    queryKey: ["new-workflows", "run-step-tree", runId],
    enabled: () => Boolean(toValue(runId)) && toValue(enabled),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/runs/{runId}/step-tree", {
          params: { path: { runId: toValue(runId)! } },
        }),
      ),
  });
}

/**
 * Same as `useWorkflowRunStepsQuery`, but for a workflow/plan file that's
 * never been run — resolved straight from its definition instead of an
 * existing run's `workflow_ref`, so a sidebar/outline can show before any
 * run exists (see `RunView.vue`'s pre-run layout).
 */
export function useWorkflowStepsQuery(id: MaybeRefOrGetter<string | undefined>) {
  const client = createWorkflowsClient();
  return useQuery<NewWorkflowsResponseBody["getWorkflowSteps"][200], TanstackError>({
    queryKey: ["new-workflows", "workflow-steps", id],
    enabled: () => Boolean(toValue(id)),
    queryFn: () =>
      handleClientMethod(
        client.GET("/api/workflows/{id}/steps", { params: { path: { id: toValue(id)! } } }),
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
      // Merge tip-only (don't invalidate all infinite pages — that gaps
      // older cached pages). SSE does the same during the turn.
      void prependNewerRunLogs(queryClient, runId);
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

export interface GotoWorkflowRunVariables {
  runId: string;
  /** Slash-separated step indices from the root (e.g. `2/4`). */
  path: string;
}

export function useGotoWorkflowRunMutation() {
  const client = createWorkflowsClient();
  const queryClient = useQueryClient();
  return useMutation<
    NewWorkflowsResponseBody["gotoWorkflowRun"][200],
    TanstackError,
    GotoWorkflowRunVariables
  >({
    mutationFn: ({ runId, path }) =>
      handleClientMethod(
        client.POST("/api/runs/{runId}/goto", {
          params: { path: { runId } },
          body: { path },
        }),
      ),
    onSuccess: (_data, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run", runId] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-steps", runId] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "run-step-tree", runId] });
      queryClient.invalidateQueries({ queryKey: ["new-workflows", "workflow-runs"] });
    },
  });
}

export interface PreviewWorkflowRunDiffVariables {
  runId: string;
  /** Other run ids, earliest first — see `previewRunDiff`'s doc comment (dev-site-http). */
  baseRunIds?: string[];
}

/**
 * Computes what the run's workflow would change, as a diff against the
 * repo's current commit (or, via `baseRunIds`, chained onto other runs'
 * own hypothetical results) — see `preview-diff.ts` (dev-site-http). A
 * mutation, not a query: triggered on demand (a button click), and each
 * call does real (if cheap, dangling-object) git work server-side, so it
 * shouldn't run automatically or get silently refetched.
 */
export function usePreviewWorkflowRunDiffMutation() {
  const client = createDevSiteClient("");
  return useMutation<
    DevSiteResponseBody["previewWorkflowRunDiff"][200],
    TanstackError,
    PreviewWorkflowRunDiffVariables
  >({
    mutationFn: ({ runId, baseRunIds }) =>
      handleClientMethod(
        client.GET("/api/workflow-runs/{runId}/preview-diff", {
          params: {
            path: { runId },
            query: baseRunIds?.length ? { baseRunId: baseRunIds } : undefined,
          },
        }),
      ),
  });
}

export interface PreviewWorkflowDiffVariables {
  /** A registered workflow's id, or a plan file's path. */
  id: string;
  input?: Record<string, unknown>;
  /** Defaults server-side to the repo root, same as a real run's would. */
  cwd?: string;
  /** Other run ids, earliest first — see `previewWorkflowDiff`'s doc comment (dev-site-http). */
  baseRunIds?: string[];
}

/**
 * Same as {@link usePreviewWorkflowRunDiffMutation}, but for a workflow
 * that's never been run at all — no run needs to exist first. See
 * `preview-workflow-diff.ts` (dev-site-http).
 */
export function usePreviewWorkflowDiffMutation() {
  const client = createDevSiteClient("");
  return useMutation<
    DevSiteResponseBody["previewWorkflowDiff"][200],
    TanstackError,
    PreviewWorkflowDiffVariables
  >({
    mutationFn: ({ id, input, cwd, baseRunIds }) =>
      handleClientMethod(
        client.POST("/api/workflows/{id}/preview-diff", {
          params: { path: { id } },
          body: { input, cwd, baseRunIds },
        }),
      ),
  });
}
