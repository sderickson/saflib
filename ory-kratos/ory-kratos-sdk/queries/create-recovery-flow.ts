import type { GenericError, RecoveryFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { SessionAlreadyAvailable, UnhandledResponse } from "../flow-results.ts";

export class RecoveryFlowCreated {
  constructor(readonly flow: RecoveryFlow) {}
}

export function createRecoveryFlowQueryKey(returnTo?: string) {
  return ["kratos", "recovery", "create", returnTo ?? ""] as const;
}

interface CreateRecoveryFlowQueryOptions {
  returnTo?: string;
  enabled?: Ref<boolean>;
}

export function createRecoveryFlowQueryOptions({
  returnTo,
  enabled,
}: CreateRecoveryFlowQueryOptions) {
  return queryOptions<
    RecoveryFlowCreated | SessionAlreadyAvailable | UnhandledResponse,
    TanstackError
  >({
    queryKey: createRecoveryFlowQueryKey(returnTo),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().createBrowserRecoveryFlow(
          returnTo ? { returnTo } : {},
        );
        return new RecoveryFlowCreated(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response) {
          const status = e.response.status;
          const raw = e.response.data;
          if (status === 400) {
            const data = raw as { error?: GenericError };
            if (data.error?.id === "session_already_available") {
              return new SessionAlreadyAvailable(data.error);
            }
          }
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

export function useCreateRecoveryFlowQuery(opts: CreateRecoveryFlowQueryOptions) {
  return useQuery(createRecoveryFlowQueryOptions(opts));
}
