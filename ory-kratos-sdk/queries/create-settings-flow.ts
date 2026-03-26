import type { ErrorBrowserLocationChangeRequired, SettingsFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { BrowserRedirectRequired } from "../flow-results.ts";

export class SettingsFlowCreated {
  constructor(readonly flow: SettingsFlow) {}
}

export function createSettingsFlowQueryKey(returnTo?: string) {
  return ["kratos", "settings", "create", returnTo ?? ""] as const;
}

interface CreateSettingsFlowQueryOptions {
  returnTo?: string;
  enabled?: Ref<boolean>;
}

export function createSettingsFlowQueryOptions({
  returnTo,
  enabled,
}: CreateSettingsFlowQueryOptions) {
  return queryOptions<SettingsFlowCreated | BrowserRedirectRequired, TanstackError>({
    queryKey: createSettingsFlowQueryKey(returnTo),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().createBrowserSettingsFlow(
          returnTo ? { returnTo } : {},
        );
        return new SettingsFlowCreated(res.data);
      } catch (e) {
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

export function useCreateSettingsFlowQuery(opts: CreateSettingsFlowQueryOptions) {
  return useQuery(createSettingsFlowQueryOptions(opts));
}
