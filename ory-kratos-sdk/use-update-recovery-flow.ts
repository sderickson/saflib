import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ErrorBrowserLocationChangeRequired,
  FrontendApiUpdateRecoveryFlowRequest,
  RecoveryFlow,
} from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

/**
 * Kratos may return an updated recovery flow in the Axios error response body (e.g. HTTP 400
 * validation) — same shape as a successful GET flow.
 */
export function extractRecoveryFlowFromError(e: unknown): RecoveryFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as RecoveryFlow;
  }
  return undefined;
}

/**
 * Browser flows with `Accept: application/json` can get HTTP 422 with this body instead of a 303:
 * the client must navigate to `redirect_browser_to` (session may already be established).
 * This shape does **not** include `ui` (unlike validation errors that return a full flow).
 */
export function extractBrowserLocationChangeRequiredFromError(
  e: unknown,
): ErrorBrowserLocationChangeRequired | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (!d || typeof d !== "object") return undefined;
  if ("ui" in d) return undefined;
  const redirect = (d as ErrorBrowserLocationChangeRequired).redirect_browser_to;
  if (typeof redirect !== "string" || !redirect.trim()) return undefined;
  return d as ErrorBrowserLocationChangeRequired;
}

export const useUpdateRecoveryFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: FrontendApiUpdateRecoveryFlowRequest) => {
      const res = await getKratosFrontendApi().updateRecoveryFlow(vars);
      return res.data;
    },
    onSuccess: () => {
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
