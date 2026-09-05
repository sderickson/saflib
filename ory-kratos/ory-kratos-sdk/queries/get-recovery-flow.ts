import type { RecoveryFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { FlowGone, SecurityCsrfViolation, UnhandledResponse } from "../flow-results.ts";
import { resultFromKratosGetFlowHttpError } from "../get-flow-query-error.ts";

export class RecoveryFlowFetched {
  constructor(readonly flow: RecoveryFlow) {}
}

export function getRecoveryFlowQueryKey(flowId: string) {
  return ["kratos", "recovery", "get", flowId] as const;
}

interface GetRecoveryFlowQueryOptions {
  flowId: string | undefined;
  enabled?: Ref<boolean>;
}

export function getRecoveryFlowQueryOptions({
  flowId,
  enabled,
}: GetRecoveryFlowQueryOptions) {
  return queryOptions<
    RecoveryFlowFetched | FlowGone | SecurityCsrfViolation | UnhandledResponse,
    TanstackError
  >({
    queryKey: getRecoveryFlowQueryKey(flowId ?? ""),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().getRecoveryFlow({ id: flowId! });
        return new RecoveryFlowFetched(res.data);
      } catch (e) {
        const r = resultFromKratosGetFlowHttpError(e);
        if (r) return r;
        if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
        throw e;
      }
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useGetRecoveryFlowQuery(opts: GetRecoveryFlowQueryOptions) {
  return useQuery(getRecoveryFlowQueryOptions(opts));
}
