import type { VerificationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";

export class VerificationFlowCreated {
  constructor(readonly flow: VerificationFlow) {}
}

export function createVerificationFlowQueryKey(returnTo?: string) {
  return ["kratos", "verification", "create", returnTo ?? ""] as const;
}

interface CreateVerificationFlowQueryOptions {
  returnTo?: string;
  enabled?: Ref<boolean>;
}

export function createVerificationFlowQueryOptions({
  returnTo,
  enabled,
}: CreateVerificationFlowQueryOptions) {
  return queryOptions<VerificationFlowCreated, TanstackError>({
    queryKey: createVerificationFlowQueryKey(returnTo),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().createBrowserVerificationFlow(
          returnTo ? { returnTo } : {},
        );
        return new VerificationFlowCreated(res.data);
      } catch (e) {
        if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
        throw e;
      }
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useCreateVerificationFlowQuery(opts: CreateVerificationFlowQueryOptions) {
  return useQuery(createVerificationFlowQueryOptions(opts));
}
