import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { RecoveryFlow } from "@ory/client";
import {
  fetchBrowserRecoveryFlow,
  fetchRecoveryFlowById,
} from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
import type { Ref } from "vue";
import type { TanstackError } from "@saflib/sdk";

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

interface RecoveryFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  enabled?: Ref<boolean>;
}

/** Cached recovery flow from `fetchBrowserRecoveryFlow` or `fetchRecoveryFlowById`. */
export function recoveryFlowQueryOptions({
  flowId,
  returnTo,
  enabled,
}: RecoveryFlowQueryOptions) {
  const queryKey = recoveryFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "recovery",
    string,
  ];
  return queryOptions<RecoveryFlow, TanstackError>({
    queryKey,
    queryFn: async () =>
      flowId
        ? fetchRecoveryFlowById(flowId)
        : fetchBrowserRecoveryFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useRecoveryFlowQuery({
  flowId,
  returnTo,
  enabled,
}: RecoveryFlowQueryOptions) {
  return useQuery(recoveryFlowQueryOptions({ flowId, returnTo, enabled }));
}
