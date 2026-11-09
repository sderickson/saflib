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
}

/** Persisted logs, newest first, a page at a time (`fetchNextPage`). */
export function useListAdminLogs(filters: Ref<AdminLogFilters>) {
  const client = getClient();
  type Page = OpsResponseBody["listOpsLogs"][200];
  return useInfiniteQuery<Page, TanstackError, InfiniteData<Page, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: computed(() => ["ops", "logs", { ...filters.value }] as const),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const f = filters.value;
      return handleClientMethod(
        client.GET("/ops/logs", {
          params: {
            query: {
              limit: 100,
              ...(f.level ? { level: f.level } : {}),
              ...(f.q ? { q: f.q } : {}),
              ...(f.request_id ? { request_id: f.request_id } : {}),
              ...(pageParam ? { cursor: pageParam } : {}),
            },
          },
        }),
      );
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}

/** The digest: health, deploys, issues, alerts, metrics since `since` (default 24h). */
export function useOpsDigest(since?: Ref<string | undefined>) {
  const client = getClient();
  return useQuery<OpsResponseBody["getOpsDigest"][200], TanstackError>({
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
export function useListOpsIssues(statuses: Ref<IssueStatusFilter[]>) {
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
export function useListOpsAlerts(view: Ref<{ all: boolean; since?: string }>) {
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

/** A signed graph link (PNG URL usable in <img>), minted once per query/range. */
export function useOpsGraphLink(body: OpsRequestBody["createOpsGraphLink"]) {
  const client = getClient();
  return useQuery<OpsResponseBody["createOpsGraphLink"][200], TanstackError>({
    queryKey: ["ops", "graph-link", body],
    staleTime: 5 * 60_000,
    queryFn: () => handleClientMethod(client.POST("/ops/metrics/graph-links", { body })),
  });
}
