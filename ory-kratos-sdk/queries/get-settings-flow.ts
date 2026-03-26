import type {
  ErrorBrowserLocationChangeRequired,
  GenericError,
  SettingsFlow,
} from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { BrowserRedirectRequired, FlowGone } from "../flow-results.ts";

export class SettingsFlowFetched {
  constructor(readonly flow: SettingsFlow) {}
}

export function getSettingsFlowQueryKey(flowId: string) {
  return ["kratos", "settings", "get", flowId] as const;
}

interface GetSettingsFlowQueryOptions {
  flowId: string | undefined;
  enabled?: Ref<boolean>;
}

export function getSettingsFlowQueryOptions({
  flowId,
  enabled,
}: GetSettingsFlowQueryOptions) {
  return queryOptions<SettingsFlowFetched | FlowGone | BrowserRedirectRequired, TanstackError>({
    queryKey: getSettingsFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getSettingsFlow({ id: flowId! });
        return new SettingsFlowFetched(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 410) {
          return new FlowGone(e.response.data as GenericError);
        }
        if (isAxiosError(e) && e.response?.status === 403) {
          const d = e.response.data as ErrorBrowserLocationChangeRequired | undefined;
          if (d?.redirect_browser_to?.trim()) {
            return new BrowserRedirectRequired(d);
          }
        }
        if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
        throw e;
      }
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useGetSettingsFlowQuery(opts: GetSettingsFlowQueryOptions) {
  return useQuery(getSettingsFlowQueryOptions(opts));
}
