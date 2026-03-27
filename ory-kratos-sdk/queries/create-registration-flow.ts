import type { GenericError, RegistrationFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { SessionAlreadyAvailable, UnhandledResponse } from "../flow-results.ts";

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
    RegistrationFlowCreated | SessionAlreadyAvailable | UnhandledResponse,
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

export function useCreateRegistrationFlowQuery(
  opts: CreateRegistrationFlowQueryOptions,
) {
  return useQuery(createRegistrationFlowQueryOptions(opts));
}
