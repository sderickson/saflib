import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { VerificationFlow } from "@ory/client";
import {
  fetchBrowserVerificationFlow,
  fetchVerificationFlowById,
} from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";

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

export type VerificationFlowQueryKey = ReturnType<
  typeof verificationFlowQueryKey
>;

interface VerificationFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  enabled?: Ref<boolean>;
}

/** Cached verification flow from `fetchBrowserVerificationFlow` or `fetchVerificationFlowById`. */
export function verificationFlowQueryOptions({
  flowId,
  returnTo,
  enabled,
}: VerificationFlowQueryOptions) {
  const queryKey = verificationFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "verification",
    string,
  ];
  return queryOptions<VerificationFlow, TanstackError>({
    queryKey,
    queryFn: async () =>
      flowId
        ? fetchVerificationFlowById(flowId)
        : fetchBrowserVerificationFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useVerificationFlowQuery({
  flowId,
  returnTo,
  enabled,
}: VerificationFlowQueryOptions) {
  return useQuery(verificationFlowQueryOptions({ flowId, returnTo, enabled }));
}
