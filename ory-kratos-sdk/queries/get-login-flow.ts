import type { LoginFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { FlowGone } from "../flow-results.ts";

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
  return queryOptions<LoginFlowFetched | FlowGone, TanstackError>({
    queryKey: getLoginFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getLoginFlow({ id: flowId! });
        return new LoginFlowFetched(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 410) {
          return new FlowGone();
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
