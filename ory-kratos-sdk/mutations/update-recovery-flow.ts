import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ErrorBrowserLocationChangeRequired,
  FrontendApiUpdateRecoveryFlowRequest,
  RecoveryFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosSessionQueries } from "../kratos-session.ts";
import { BrowserRedirectRequired } from "../flow-results.ts";

export class RecoveryFlowUpdated {
  constructor(readonly flow: RecoveryFlow) {}
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
    RecoveryFlowUpdated | BrowserRedirectRequired,
    TanstackError,
    FrontendApiUpdateRecoveryFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateRecoveryFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateRecoveryFlow(vars);
        return new RecoveryFlowUpdated(res.data);
      } catch (e: unknown) {
        if (isAxiosError(e)) {
          const d = e.response?.data;
          if (
            d && typeof d === "object" &&
            !("ui" in d) &&
            "redirect_browser_to" in d
          ) {
            const payload = d as ErrorBrowserLocationChangeRequired;
            if (payload.redirect_browser_to?.trim()) {
              return new BrowserRedirectRequired(payload);
            }
          }
        }
        const flow = extractRecoveryFlow(e);
        if (flow) return new RecoveryFlowUpdated(flow);
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
