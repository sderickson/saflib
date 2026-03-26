import type { LoginFlow } from "@ory/client";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";

export class LoginFlowCreated {
  constructor(readonly flow: LoginFlow) {}
}

export function createLoginFlowQueryKey(returnTo?: string, refresh?: boolean) {
  return ["kratos", "login", "create", `${returnTo ?? ""}:${refresh ? "1" : "0"}`] as const;
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
  return queryOptions<LoginFlowCreated, TanstackError>({
    queryKey: createLoginFlowQueryKey(returnTo, refresh),
    queryFn: async () => {
      const params: { returnTo?: string; refresh?: boolean } = {};
      if (returnTo) params.returnTo = returnTo;
      if (refresh) params.refresh = true;
      const res = await getKratosFrontendApi().createBrowserLoginFlow(params);
      return new LoginFlowCreated(res.data);
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useCreateLoginFlowQuery(opts: CreateLoginFlowQueryOptions) {
  return useQuery(createLoginFlowQueryOptions(opts));
}
