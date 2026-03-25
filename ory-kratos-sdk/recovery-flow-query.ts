import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { RecoveryFlow } from "@ory/client";
import { fetchBrowserRecoveryFlow, fetchRecoveryFlowById } from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";

/**
 * Stable key: flow id when resuming `?flow=`; otherwise browser init keyed by `returnTo`
 * (from `?redirect=`) so different `return_to` values do not share cache.
 * Third segment is a single encoded string so the query key tuple stays a consistent 3-tuple.
 */
export function recoveryFlowQueryKey(flowId?: string, returnTo?: string) {
  if (flowId) {
    return ["kratos", "recovery", `id:${flowId}`] as const;
  }
  return ["kratos", "recovery", `browser:${returnTo ?? ""}`] as const;
}

export type RecoveryFlowQueryKey = ReturnType<typeof recoveryFlowQueryKey>;

/** Cached recovery flow from `fetchBrowserRecoveryFlow` or `fetchRecoveryFlowById`. */
export function recoveryFlowQueryOptions(flowId?: string, returnTo?: string) {
  const queryKey = recoveryFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "recovery",
    string,
  ];
  return queryOptions({
    queryKey,
    queryFn: async (): Promise<RecoveryFlow> =>
      flowId ? fetchRecoveryFlowById(flowId) : fetchBrowserRecoveryFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
  });
}

export function useRecoveryFlowQuery(flowId?: string, returnTo?: string) {
  return useQuery(recoveryFlowQueryOptions(flowId, returnTo));
}
