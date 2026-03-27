import type { GenericError, LoginFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { SessionAlreadyAvailable } from "../flow-results.ts";

export class LoginFlowCreated {
  constructor(readonly flow: LoginFlow) {}
}

export function createLoginFlowQueryKey(returnTo?: string, refresh?: boolean) {
  return [
    "kratos",
    "login",
    "create",
    `${returnTo ?? ""}:${refresh ? "1" : "0"}`,
  ] as const;
}

interface CreateLoginFlowQueryOptions {
  returnTo?: string;
  refresh?: boolean;
  enabled?: Ref<boolean>;
}

export function createLoginFlowQueryOptions({
  returnTo,
  refresh,
  enabled,
}: CreateLoginFlowQueryOptions) {
  return queryOptions<
    LoginFlowCreated | SessionAlreadyAvailable,
    TanstackError
  >({
    queryKey: createLoginFlowQueryKey(returnTo, refresh),
    queryFn: async () => {
      try {
        const params: { returnTo?: string; refresh?: boolean } = {};
        if (returnTo) params.returnTo = returnTo;
        if (refresh) params.refresh = true;
        const res = await getKratosFrontendApi().createBrowserLoginFlow(params);
        return new LoginFlowCreated(res.data);
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

export function useCreateLoginFlowQuery(opts: CreateLoginFlowQueryOptions) {
  return useQuery(createLoginFlowQueryOptions(opts));
}
