import type { RegistrationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";

export class RegistrationFlowCreated {
  constructor(readonly flow: RegistrationFlow) {}
}

export function createRegistrationFlowQueryKey(returnTo?: string) {
  return ["kratos", "registration", "create", returnTo ?? ""] as const;
}

interface CreateRegistrationFlowQueryOptions {
  returnTo?: string;
  enabled?: Ref<boolean>;
}

export function createRegistrationFlowQueryOptions({
  returnTo,
  enabled,
}: CreateRegistrationFlowQueryOptions) {
  return queryOptions<RegistrationFlowCreated, TanstackError>({
    queryKey: createRegistrationFlowQueryKey(returnTo),
    queryFn: async () => {
      const res = await getKratosFrontendApi().createBrowserRegistrationFlow(
        returnTo ? { returnTo } : {},
      );
      return new RegistrationFlowCreated(res.data);
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useCreateRegistrationFlowQuery(opts: CreateRegistrationFlowQueryOptions) {
  return useQuery(createRegistrationFlowQueryOptions(opts));
}
