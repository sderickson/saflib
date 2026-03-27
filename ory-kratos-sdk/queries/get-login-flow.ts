import type { GenericError, LoginFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { FlowGone, UnhandledResponse } from "../flow-results.ts";

export class LoginFlowFetched {
  constructor(readonly flow: LoginFlow) {}
}

export function getLoginFlowQueryKey(flowId: string) {
  return ["kratos", "login", "get", flowId] as const;
}

interface GetLoginFlowQueryOptions {
  flowId: string | undefined;
  enabled?: Ref<boolean>;
}

export function getLoginFlowQueryOptions({
  flowId,
  enabled,
}: GetLoginFlowQueryOptions) {
  return queryOptions<LoginFlowFetched | FlowGone | UnhandledResponse, TanstackError>({
    queryKey: getLoginFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getLoginFlow({ id: flowId! });
        return new LoginFlowFetched(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          const status = e.response.status;
          if (status === 410) {
            return new FlowGone(e.response.data as GenericError);
          }
          if (status >= 400 && status < 500) {
            return new UnhandledResponse(status, e.response.data);
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

export function useGetLoginFlowQuery(opts: GetLoginFlowQueryOptions) {
  return useQuery(getLoginFlowQueryOptions(opts));
}
