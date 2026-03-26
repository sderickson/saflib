import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ErrorBrowserLocationChangeRequired,
  FrontendApiUpdateLoginFlowRequest,
  LoginFlow,
  SuccessfulNativeLogin,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosSessionQueries } from "../kratos-session.ts";
import { BrowserRedirectRequired } from "../flow-results.ts";

export class LoginFlowUpdated {
  constructor(readonly flow: LoginFlow) {}
}

export class LoginCompleted {
  constructor(readonly session: SuccessfulNativeLogin) {}
}

function extractLoginFlow(e: unknown): LoginFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as LoginFlow;
  }
  return undefined;
}

export const useUpdateLoginFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    LoginFlowUpdated | LoginCompleted | BrowserRedirectRequired,
    TanstackError,
    FrontendApiUpdateLoginFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateLoginFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateLoginFlow(vars);
        return new LoginCompleted(res.data);
      } catch (e: unknown) {
        const flow = extractLoginFlow(e);
        if (flow) return new LoginFlowUpdated(flow);
        if (isAxiosError(e)) {
          if (e.response?.status === 422) {
            const d = e.response.data as ErrorBrowserLocationChangeRequired | undefined;
            if (d?.redirect_browser_to?.trim()) {
              return new BrowserRedirectRequired(d);
            }
          }
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    onSuccess: (result) => {
      if (result instanceof LoginCompleted) {
        void invalidateKratosSessionQueries(queryClient);
      }
    },
  });
};
