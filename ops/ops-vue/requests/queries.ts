import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { OpsRequestBody, OpsResponseBody } from "@saflib/ops-spec";
import { TanstackError, handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

const opsTokensKey = ["ops", "tokens"] as const;

export function useListOpsTokens() {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsTokens"][200], TanstackError>({
    queryKey: opsTokensKey,
    queryFn: () => handleClientMethod(client.GET("/admin/ops-tokens", {})),
  });
}

export function useCreateOpsToken() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<
    OpsResponseBody["createOpsToken"][201],
    TanstackError,
    OpsRequestBody["createOpsToken"]
  >({
    mutationFn: (body) => handleClientMethod(client.POST("/admin/ops-tokens", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opsTokensKey }),
  });
}

export function useRevokeOpsToken() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["revokeOpsToken"][200], TanstackError, { id: string }>({
    mutationFn: ({ id }) =>
      handleClientMethod(
        client.POST("/admin/ops-tokens/{id}/revoke", { params: { path: { id } }, body: {} }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opsTokensKey }),
  });
}

export interface AdminLogFilters {
  level?: "error" | "warn" | "info";
  q?: string;
  request_id?: string;
  /** Lines from one request, job delivery, cron tick or process. */
  context_id?: string;
  /** Lines by one user. */
  user_id?: string;
}

const LIVE_POLL_MS = 5000;

function logQuery(f: AdminLogFilters) {
  return {
    ...(f.level ? { level: f.level } : {}),
    ...(f.q ? { q: f.q } : {}),
    ...(f.request_id ? { request_id: f.request_id } : {}),
    ...(f.context_id ? { context_id: f.context_id } : {}),
    ...(f.user_id ? { user_id: f.user_id } : {}),
  };
}

/** Persisted logs, newest first, a page at a time (`fetchNextPage`). */
export function useListAdminLogs(filters: Ref<AdminLogFilters>, live?: Ref<boolean>) {
  const client = getClient();
  type Page = OpsResponseBody["listOpsLogs"][200];
  return useInfiniteQuery<Page, TanstackError, InfiniteData<Page, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: computed(() => ["ops", "logs", { ...filters.value }] as const),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      handleClientMethod(
        client.GET("/ops/logs", {
          params: {
            query: { limit: 100, ...logQuery(filters.value), ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchInterval: computed(() => (live?.value ? LIVE_POLL_MS : false)),
  });
}

/** Log lines grouped by request, job, cron tick or process, newest first. */
export function useListLogGroups(filters: Ref<AdminLogFilters>, live?: Ref<boolean>) {
  const client = getClient();
  type Page = OpsResponseBody["listOpsLogGroups"][200];
  return useInfiniteQuery<Page, TanstackError, InfiniteData<Page, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: computed(() => ["ops", "log-groups", { ...filters.value }] as const),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const { request_id: _r, ...f } = filters.value;
      return handleClientMethod(
        client.GET("/ops/logs/groups", {
          params: { query: { limit: 50, ...logQuery(f), ...(pageParam ? { cursor: pageParam } : {}) } },
        }),
      );
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchInterval: computed(() => (live?.value ? LIVE_POLL_MS : false)),
  });
}

/** Every line of one group (oldest first), for an expanded row. */
export function useLogGroupLines(contextId: Ref<string | null>, live?: Ref<boolean>) {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsLogs"][200]["logs"], TanstackError>({
    queryKey: computed(() => ["ops", "logs", "group", contextId.value] as const),
    enabled: computed(() => !!contextId.value),
    queryFn: async () => {
      const page = await handleClientMethod(
        client.GET("/ops/logs", {
          params: { query: { context_id: contextId.value!, level: "http", limit: 500 } },
        }),
      );
      return [...page.logs].reverse();
    },
    refetchInterval: computed(() => (live?.value ? LIVE_POLL_MS : false)),
  });
}

/** A PromQL range query over the last `hours` (about 120 points). */
export function useOpsMetricsRange(query: Ref<string>, hours: Ref<number>, enabled?: Ref<boolean>) {
  const client = getClient();
  return useQuery<OpsResponseBody["queryOpsMetricsRange"][200], TanstackError>({
    queryKey: computed(() => ["ops", "metrics", "range", query.value, hours.value] as const),
    enabled: computed(() => query.value.trim() !== "" && (enabled?.value ?? true)),
    retry: false,
    staleTime: 60_000,
    queryFn: () => {
      const end = Math.floor(Date.now() / 1000);
      const start = end - hours.value * 3600;
      const step = Math.max(60, Math.floor((end - start) / 120));
      return handleClientMethod(
        client.GET("/ops/metrics/query_range", {
          params: {
            query: {
              query: query.value,
              start: new Date(start * 1000).toISOString(),
              end: new Date(end * 1000).toISOString(),
              step,
            },
          },
        }),
      );
    },
  });
}

/** Deploy history: new builds, newest first. */
export function useOpsDeploys(limit = 20) {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsDeploys"][200], TanstackError>({
    queryKey: ["ops", "deploys", limit],
    queryFn: () => handleClientMethod(client.GET("/ops/deploys", { params: { query: { limit } } })),
  });
}

/** Every health check's latest result (runs them). */
export function useOpsHealth(enabled?: Ref<boolean>) {
  const client = getClient();
  return useQuery<OpsResponseBody["getOpsHealth"][200], TanstackError>({
    queryKey: ["ops", "health"],
    enabled: enabled ?? true,
    staleTime: 30_000,
    queryFn: () => handleClientMethod(client.GET("/ops/health")),
  });
}

/** The digest: health, deploys, issues, alerts, metrics since `since` (default 24h). */
export function useOpsDigest(since?: Ref<string | undefined>) {
  const client = getClient();
  return useQuery<OpsResponseBody["getOpsDigest"][200], TanstackError>({
    // Shared by the Overview, the top bar and sidebar badges: one request a
    // minute however many of them are on screen.
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryKey: computed(() => ["ops", "digest", since?.value ?? null] as const),
    queryFn: () =>
      handleClientMethod(
        client.GET("/ops/digest", { params: { query: since?.value ? { since: since.value } : {} } }),
      ),
  });
}

export type IssueStatusFilter = "open" | "regressed" | "resolved" | "ignored";

const issuesKey = ["ops", "issues"] as const;

/** Issues with the given statuses, most recently seen first. */
export function useListOpsIssues(statuses: Readonly<Ref<IssueStatusFilter[]>>) {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsIssues"][200], TanstackError>({
    queryKey: computed(() => [...issuesKey, "list", [...statuses.value]] as const),
    queryFn: () =>
      handleClientMethod(
        client.GET("/ops/issues", { params: { query: { status: statuses.value, sort: "last_seen", limit: 100 } } }),
      ),
  });
}

/** Recent occurrences of one issue; only fetched once `id` is set. */
export function useListOpsIssueOccurrences(id: Ref<string | null>) {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsIssueOccurrences"][200], TanstackError>({
    queryKey: computed(() => [...issuesKey, "occurrences", id.value] as const),
    enabled: computed(() => id.value !== null),
    queryFn: () =>
      handleClientMethod(
        client.GET("/ops/issues/{id}/occurrences", { params: { path: { id: id.value! }, query: { limit: 10 } } }),
      ),
  });
}

export type IssueTriage =
  | { action: "resolve"; id: string; note?: string }
  | { action: "ignore"; id: string; note?: string; until?: string }
  | { action: "reopen"; id: string; note?: string };

/** Resolve, ignore or reopen an issue; refreshes issues and the digest. */
export function useTriageOpsIssue() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["resolveOpsIssue"][200], TanstackError, IssueTriage>({
    mutationFn: (t) => {
      const path = { id: t.id };
      const note = t.note ? { note: t.note } : {};
      if (t.action === "resolve") {
        return handleClientMethod(client.POST("/ops/issues/{id}/resolve", { params: { path }, body: note }));
      }
      if (t.action === "ignore") {
        return handleClientMethod(
          client.POST("/ops/issues/{id}/ignore", { params: { path }, body: { ...note, ...(t.until ? { until: t.until } : {}) } }),
        );
      }
      return handleClientMethod(client.POST("/ops/issues/{id}/reopen", { params: { path }, body: note }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issuesKey });
      void queryClient.invalidateQueries({ queryKey: ["ops", "digest"] });
    },
  });
}

const alertsKey = ["ops", "alerts"] as const;

/** Firing alerts, or everything active since `since` when `all` is set. */
export function useListOpsAlerts(view: Readonly<Ref<{ all: boolean; since?: string }>>) {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsAlerts"][200], TanstackError>({
    queryKey: computed(() => [...alertsKey, { ...view.value }] as const),
    queryFn: () =>
      handleClientMethod(
        client.GET("/ops/alerts", {
          params: {
            query: view.value.all
              ? { status: "all", ...(view.value.since ? { since: view.value.since } : {}), limit: 200 }
              : { status: "firing", limit: 200 },
          },
        }),
      ),
  });
}

export function useAckOpsAlert() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["ackOpsAlert"][200], TanstackError, { id: string }>({
    mutationFn: ({ id }) =>
      handleClientMethod(client.POST("/ops/alerts/{id}/ack", { params: { path: { id } }, body: {} })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsKey });
      void queryClient.invalidateQueries({ queryKey: ["ops", "digest"] });
    },
  });
}

/** Resolve an alert by hand (e.g. one from a host that's gone). */
export function useResolveOpsAlert() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["resolveOpsAlert"][200], TanstackError, { id: string }>({
    mutationFn: ({ id }) =>
      handleClientMethod(client.POST("/ops/alerts/{id}/resolve", { params: { path: { id } }, body: {} })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsKey });
      void queryClient.invalidateQueries({ queryKey: ["ops", "digest"] });
    },
  });
}

/** A signed graph link (PNG URL usable in <img>), minted once per query/range. */
export function useOpsGraphLink(body: OpsRequestBody["createOpsGraphLink"]) {
  const client = getClient();
  return useQuery<OpsResponseBody["createOpsGraphLink"][200], TanstackError>({
    queryKey: ["ops", "graph-link", body],
    staleTime: 5 * 60_000,
    queryFn: () => handleClientMethod(client.POST("/ops/metrics/graph-links", { body })),
  });
}

/**
 * Instant PromQL (current value per series); disabled while the query is
 * empty. Unlike other queries, errors keep the server's message (e.g.
 * Prometheus's parse error): on this page it's what the admin needs.
 */
export function useOpsMetricsInstant(query: Ref<string>) {
  const client = getClient();
  return useQuery<OpsResponseBody["queryOpsMetrics"][200], Error>({
    queryKey: computed(() => ["ops", "metrics", "instant", query.value] as const),
    enabled: computed(() => query.value.trim() !== ""),
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await client.GET("/ops/metrics/query", {
        params: { query: { query: query.value } },
      });
      if (data) return data;
      const message = (error as { message?: unknown } | undefined)?.message;
      throw new Error(typeof message === "string" ? message : `Request failed (${response.status})`);
    },
  });
}

/** The latest dependency check (advisories, outdated direct dependencies). */
export function useOpsDependencies() {
  const client = getClient();
  return useQuery<OpsResponseBody["getOpsDependencies"][200], TanstackError>({
    queryKey: ["ops", "dependencies"],
    queryFn: () => handleClientMethod(client.GET("/ops/dependencies", {})),
  });
}

/** The self-test probes and why any can't run here. */
export function useOpsDiagnostics() {
  const client = getClient();
  return useQuery<OpsResponseBody["listOpsDiagnostics"][200], TanstackError>({
    queryKey: ["ops", "diagnostics"],
    queryFn: () => handleClientMethod(client.GET("/ops/diagnostics", {})),
  });
}

/** Fire one server probe. The server-500 probe's 500 is its signal, not a failure. */
export async function runOpsDiagnosticProbe(runId: string, probeId: string): Promise<void> {
  const { response } = await getClient().POST("/ops/diagnostics/runs/{run_id}/probes/{probe_id}", {
    params: { path: { run_id: runId, probe_id: probeId } },
    body: {},
  });
  if (!response.ok && !(probeId === "server-500" && response.status === 500)) {
    throw new Error(`Probe ${probeId} answered ${response.status}`);
  }
}

/** Where a run's signals have landed so far. */
export async function getOpsDiagnosticRun(runId: string, since: string) {
  return handleClientMethod(
    getClient().GET("/ops/diagnostics/runs/{run_id}", {
      params: { path: { run_id: runId }, query: { since } },
    }),
  );
}

export function useClearOpsDiagnostics() {
  const client = getClient();
  const queryClient = useQueryClient();
  return useMutation<OpsResponseBody["clearOpsDiagnostics"][200], TanstackError>({
    mutationFn: () => handleClientMethod(client.POST("/ops/diagnostics/clear", { body: {} })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ops"] }),
  });
}

/** This process's /metrics, summarized; `raw` adds the text exposition. */
export function useOpsDiagnosticMetrics(raw: Ref<boolean>) {
  const client = getClient();
  return useQuery<OpsResponseBody["getOpsDiagnosticMetrics"][200], TanstackError>({
    queryKey: computed(() => ["ops", "diagnostics", "metrics", raw.value] as const),
    queryFn: () =>
      handleClientMethod(
        client.GET("/ops/diagnostics/metrics", { params: { query: raw.value ? { raw: "1" } : {} } }),
      ),
  });
}
