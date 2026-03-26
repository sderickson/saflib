import type { RegistrationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { FlowGone } from "../flow-results.ts";

export class RegistrationFlowFetched {
  constructor(readonly flow: RegistrationFlow) {}
}

export function getRegistrationFlowQueryKey(flowId: string) {
  return ["kratos", "registration", "get", flowId] as const;
}

interface GetRegistrationFlowQueryOptions {
  flowId: string | undefined;
  enabled?: Ref<boolean>;
}

export function getRegistrationFlowQueryOptions({
  flowId,
  enabled,
}: GetRegistrationFlowQueryOptions) {
  return queryOptions<RegistrationFlowFetched | FlowGone, TanstackError>({
    queryKey: getRegistrationFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getRegistrationFlow({ id: flowId! });
        return new RegistrationFlowFetched(res.data);
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

export function useGetRegistrationFlowQuery(opts: GetRegistrationFlowQueryOptions) {
  return useQuery(getRegistrationFlowQueryOptions(opts));
}
