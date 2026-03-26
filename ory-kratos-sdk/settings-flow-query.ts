import { queryOptions, useQuery } from "@tanstack/vue-query";
import type {
  ErrorAuthenticatorAssuranceLevelNotSatisfied,
  SettingsFlow,
} from "@ory/client";
import { fetchBrowserSettingsFlow, fetchSettingsFlowById } from "./kratos-flows.ts";
import { kratosFlowQueryRetry } from "./kratos-query-retry.ts";
import { TanstackError } from "@saflib/sdk";
import { isAxiosError } from "axios";
import type { Ref } from "vue";

/**
 * Stable key: flow id when resuming `?flow=`; otherwise browser init keyed by `returnTo`
 * (from `?redirect=`) so different `return_to` values do not share cache.
 */
export function settingsFlowQueryKey(flowId?: string, returnTo?: string) {
  if (flowId) {
    return ["kratos", "settings", `id:${flowId}`] as const;
  }
  return ["kratos", "settings", `browser:${returnTo ?? ""}`] as const;
}

export type SettingsFlowQueryKey = ReturnType<typeof settingsFlowQueryKey>;
export type SettingsFlowQueryResult =
  | SettingsFlow
  | ErrorAuthenticatorAssuranceLevelNotSatisfied;

interface SettingsFlowQueryOptions {
  flowId?: string;
  returnTo?: string;
  enabled?: Ref<boolean>;
}

/** Cached settings flow from `fetchBrowserSettingsFlow` or `fetchSettingsFlowById`. */
export function settingsFlowQueryOptions({
  flowId,
  returnTo,
  enabled,
}: SettingsFlowQueryOptions) {
  const queryKey = settingsFlowQueryKey(flowId, returnTo) as readonly [
    "kratos",
    "settings",
    string,
  ];
  return queryOptions<SettingsFlowQueryResult, TanstackError>({
    queryKey,
    queryFn: async () => {
      try {
        return flowId
          ? fetchSettingsFlowById(flowId)
          : fetchBrowserSettingsFlow(returnTo);
      } catch (e) {
        if (isAxiosError(e)) {
          const d = e.response?.data;
          if (
            d &&
            typeof d === "object" &&
            "redirect_browser_to" in d &&
            !("ui" in d)
          ) {
            return d as ErrorAuthenticatorAssuranceLevelNotSatisfied;
          }
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    staleTime: 30_000,
    retry: kratosFlowQueryRetry,
    enabled,
  });
}

export function useSettingsFlowQuery({
  flowId,
  returnTo,
  enabled,
}: SettingsFlowQueryOptions) {
  return useQuery(settingsFlowQueryOptions({ flowId, returnTo, enabled }));
}
