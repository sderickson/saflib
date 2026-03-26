import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { LoginFlow } from "@ory/client";
import { fetchBrowserLoginFlow, fetchLoginFlowById } from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";

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

interface LoginFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  enabled?: Ref<boolean>;
}

/** Cached login flow from `fetchBrowserLoginFlow` or `fetchLoginFlowById`. */
export function loginFlowQueryOptions({
  flowId,
  returnTo,
  enabled,
}: LoginFlowQueryOptions) {
  const queryKey = loginFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "login",
    string,
  ];
  return queryOptions<LoginFlow, TanstackError>({
    queryKey,
    queryFn: async () =>
      flowId ? fetchLoginFlowById(flowId) : fetchBrowserLoginFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useLoginFlowQuery({
  flowId,
  returnTo,
  enabled,
}: LoginFlowQueryOptions) {
  return useQuery(loginFlowQueryOptions({ flowId, returnTo, enabled }));
}
