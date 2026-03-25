import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { LoginFlow } from "@ory/client";
import { fetchBrowserLoginFlow, fetchLoginFlowById } from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";

/**
 * Stable key: flow id when resuming `?flow=`; otherwise browser init keyed by `returnTo`
 * (from `?redirect=`) so different `return_to` values do not share cache.
 * Third segment is a single encoded string so the query key tuple stays a consistent 3-tuple.
 */
export function loginFlowQueryKey(flowId?: string, returnTo?: string) {
  if (flowId) {
    return ["kratos", "login", `id:${flowId}`] as const;
  }
  return ["kratos", "login", `browser:${returnTo ?? ""}`] as const;
}

export type LoginFlowQueryKey = ReturnType<typeof loginFlowQueryKey>;

/** Cached login flow from `fetchBrowserLoginFlow` or `fetchLoginFlowById`. */
export function loginFlowQueryOptions(flowId?: string, returnTo?: string) {
  const queryKey = loginFlowQueryKey(flowId, returnTo) as readonly ["kratos", "login", string];
  return queryOptions({
    queryKey,
    queryFn: async (): Promise<LoginFlow> =>
      flowId ? fetchLoginFlowById(flowId) : fetchBrowserLoginFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
  });
}

export function useLoginFlowQuery(flowId?: string, returnTo?: string) {
  return useQuery(loginFlowQueryOptions(flowId, returnTo));
}
