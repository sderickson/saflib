import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { RegistrationFlow } from "@ory/client";
import {
  fetchBrowserRegistrationFlow,
  fetchRegistrationFlowById,
} from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";

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

interface RegistrationFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  enabled?: Ref<boolean>;
}

/** Cached registration flow from `fetchBrowserRegistrationFlow` or `fetchRegistrationFlowById`. */
export function registrationFlowQueryOptions({
  flowId,
  returnTo,
  enabled,
}: RegistrationFlowQueryOptions) {
  const queryKey = registrationFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "registration",
    string,
  ];
  return queryOptions<RegistrationFlow, TanstackError>({
    queryKey,
    queryFn: async () =>
      flowId ? fetchRegistrationFlowById(flowId) : fetchBrowserRegistrationFlow(returnTo),
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useRegistrationFlowQuery({
  flowId,
  returnTo,
  enabled,
}: RegistrationFlowQueryOptions) {
  return useQuery(registrationFlowQueryOptions({ flowId, returnTo, enabled }));
}
