import type { GenericError, RegistrationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { SessionAlreadyAvailable } from "../flow-results.ts";

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
  return queryOptions<
    RegistrationFlowCreated | SessionAlreadyAvailable,
    TanstackError
  >({
    queryKey: createRegistrationFlowQueryKey(returnTo),
    queryFn: async () => {
      try {
        const res = await getKratosFrontendApi().createBrowserRegistrationFlow(
          returnTo ? { returnTo } : {},
        );
        return new RegistrationFlowCreated(res.data);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 400) {
          const data = e.response.data as { error?: GenericError };
          if (data.error?.id === "session_already_available") {
            return new SessionAlreadyAvailable(data.error);
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

export function useCreateRegistrationFlowQuery(
  opts: CreateRegistrationFlowQueryOptions,
) {
  return useQuery(createRegistrationFlowQueryOptions(opts));
}
