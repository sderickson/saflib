import type { LogoutFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { UnhandledResponse } from "../flow-results.ts";

export class BrowserLogoutFlowCreated {
  constructor(readonly flow: LogoutFlow) {}
}

export function createBrowserLogoutFlowQueryKey(returnTo?: string) {
  return ["kratos", "logout", "create", returnTo ?? ""] as const;
}

interface CreateBrowserLogoutFlowQueryOptions {
  returnTo?: string;
  enabled?: Ref<boolean>;
}

export function createBrowserLogoutFlowQueryOptions({
  returnTo,
  enabled,
}: CreateBrowserLogoutFlowQueryOptions) {
  return queryOptions<
    BrowserLogoutFlowCreated | UnhandledResponse,
    TanstackError
  >({
    queryKey: createBrowserLogoutFlowQueryKey(returnTo),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().createBrowserLogoutFlow({
          returnTo,
        });
        return new BrowserLogoutFlowCreated(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          const status = e.response.status;
          const raw = e.response.data;
          if (status >= 400 && status < 500) {
            return new UnhandledResponse(status, raw);
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

export function useCreateBrowserLogoutFlowQuery(
  opts: CreateBrowserLogoutFlowQueryOptions,
) {
  return useQuery(createBrowserLogoutFlowQueryOptions(opts));
}
