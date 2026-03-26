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
export function loginFlowQueryKey(flowId?: string, returnTo?: string, refresh?: boolean) {
  if (flowId) {
    return ["kratos", "login", `id:${flowId}`] as const;
  }
  return ["kratos", "login", `browser:${returnTo ?? ""}:refresh:${refresh ? "1" : "0"}`] as const;
}

export type LoginFlowQueryKey = ReturnType<typeof loginFlowQueryKey>;

interface LoginFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  refresh?: boolean;
  enabled?: Ref<boolean>;
}

/** Cached login flow from `fetchBrowserLoginFlow` or `fetchLoginFlowById`. */
export function loginFlowQueryOptions({
  flowId,
  returnTo,
  refresh,
  enabled,
}: LoginFlowQueryOptions) {
  const queryKey = loginFlowQueryKey(flowId, returnTo, refresh) as readonly [
    "kratos",
    "login",
    string,
  ];
  return queryOptions<LoginFlow, TanstackError>({
    queryKey,
    queryFn: async () =>
      flowId ? fetchLoginFlowById(flowId) : fetchBrowserLoginFlow(returnTo, refresh),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useLoginFlowQuery({
  flowId,
  returnTo,
  refresh,
  enabled,
}: LoginFlowQueryOptions) {
  return useQuery(loginFlowQueryOptions({ flowId, returnTo, refresh, enabled }));
}
