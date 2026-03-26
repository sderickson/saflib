import type { VerificationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { FlowGone } from "../flow-results.ts";

export class VerificationFlowFetched {
  constructor(readonly flow: VerificationFlow) {}
}

export function getVerificationFlowQueryKey(flowId: string) {
  return ["kratos", "verification", "get", flowId] as const;
}

interface GetVerificationFlowQueryOptions {
  flowId: string | undefined;
  enabled?: Ref<boolean>;
}

export function getVerificationFlowQueryOptions({
  flowId,
  enabled,
}: GetVerificationFlowQueryOptions) {
  return queryOptions<VerificationFlowFetched | FlowGone, TanstackError>({
    queryKey: getVerificationFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getVerificationFlow({ id: flowId! });
        return new VerificationFlowFetched(res.data);
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

export function useGetVerificationFlowQuery(opts: GetVerificationFlowQueryOptions) {
  return useQuery(getVerificationFlowQueryOptions(opts));
}
