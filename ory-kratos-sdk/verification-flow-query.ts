import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { VerificationFlow } from "@ory/client";
import {
  fetchBrowserVerificationFlow,
  fetchVerificationFlowById,
} from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";

/**
 * Stable key: flow id when resuming `?flow=`; otherwise browser init keyed by `returnTo`
 * (from `?redirect=`) so different `return_to` values do not share cache.
 * Third segment is a single encoded string so the query key tuple stays a consistent 3-tuple.
 */
export function verificationFlowQueryKey(flowId?: string, returnTo?: string) {
  if (flowId) {
    return ["kratos", "verification", `id:${flowId}`] as const;
  }
  return ["kratos", "verification", `browser:${returnTo ?? ""}`] as const;
}

export type VerificationFlowQueryKey = ReturnType<typeof verificationFlowQueryKey>;

/** Cached verification flow from `fetchBrowserVerificationFlow` or `fetchVerificationFlowById`. */
export function verificationFlowQueryOptions(flowId?: string, returnTo?: string) {
  const queryKey = verificationFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "verification",
    string,
  ];
  return queryOptions({
    queryKey,
    queryFn: async (): Promise<VerificationFlow> =>
      flowId ? fetchVerificationFlowById(flowId) : fetchBrowserVerificationFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
  });
}

export function useVerificationFlowQuery(flowId?: string, returnTo?: string) {
  return useQuery(verificationFlowQueryOptions(flowId, returnTo));
}
