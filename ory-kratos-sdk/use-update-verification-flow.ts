import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { FrontendApiUpdateVerificationFlowRequest, VerificationFlow } from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

/** Kratos may return an updated verification flow (validation errors) in the Axios response body (e.g. HTTP 400). */
export function extractVerificationFlowFromError(e: unknown): VerificationFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as VerificationFlow;
  }
  return undefined;
}

export const useUpdateVerificationFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: FrontendApiUpdateVerificationFlowRequest) => {
      const res = await getKratosFrontendApi().updateVerificationFlow(vars);
      return res.data;
    },
    onSuccess: () => {
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
