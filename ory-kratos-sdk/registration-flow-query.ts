import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { RegistrationFlow } from "@ory/client";
import {
  fetchBrowserRegistrationFlow,
  fetchRegistrationFlowById,
} from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";

/**
 * Stable key: flow id when resuming `?flow=`; otherwise browser init keyed by `returnTo`
 * (from `?redirect=`) so different `return_to` values do not share cache.
 * Third segment is a single encoded string so the query key tuple stays a consistent 3-tuple.
 */
export function registrationFlowQueryKey(flowId?: string, returnTo?: string) {
  if (flowId) {
    return ["kratos", "registration", `id:${flowId}`] as const;
  }
  return ["kratos", "registration", `browser:${returnTo ?? ""}`] as const;
}

export type RegistrationFlowQueryKey = ReturnType<typeof registrationFlowQueryKey>;

/** Cached registration flow from `fetchBrowserRegistrationFlow` or `fetchRegistrationFlowById`. */
export function registrationFlowQueryOptions(flowId?: string, returnTo?: string) {
  const queryKey = registrationFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "registration",
    string,
  ];
  return queryOptions({
    queryKey,
    queryFn: async (): Promise<RegistrationFlow> =>
      flowId ? fetchRegistrationFlowById(flowId) : fetchBrowserRegistrationFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
  });
}

export function useRegistrationFlowQuery(flowId?: string, returnTo?: string) {
  return useQuery(registrationFlowQueryOptions(flowId, returnTo));
}
