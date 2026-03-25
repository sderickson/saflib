import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ErrorBrowserLocationChangeRequired,
  FrontendApiUpdateRecoveryFlowRequest,
  RecoveryFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

export class BrowserRedirectRequired {
  constructor(readonly payload: ErrorBrowserLocationChangeRequired) {}
}

function isBrowserLocationChangeBody(
  d: unknown,
): d is ErrorBrowserLocationChangeRequired {
  if (!d || typeof d !== "object") return false;
  if ("ui" in d) return false;
  const redirect = (d as ErrorBrowserLocationChangeRequired)
    .redirect_browser_to;
  return typeof redirect === "string" && redirect.trim().length > 0;
}

function extractRecoveryFlow(e: unknown): RecoveryFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as RecoveryFlow;
  }
  return undefined;
}

export const useUpdateRecoveryFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    RecoveryFlow | BrowserRedirectRequired,
    TanstackError,
    FrontendApiUpdateRecoveryFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateRecoveryFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateRecoveryFlow(vars);
        return res.data;
      } catch (e: unknown) {
        if (isAxiosError(e)) {
          const d = e.response?.data;
          if (isBrowserLocationChangeBody(d)) {
            return new BrowserRedirectRequired(d);
          }
        }
        const flow = extractRecoveryFlow(e);
        if (flow) return flow;
        if (e instanceof AxiosError) {
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    onSuccess: () => {
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
