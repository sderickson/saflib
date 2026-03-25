import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { FrontendApiUpdateLoginFlowRequest, LoginFlow } from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

/** Kratos may return an updated login flow (validation errors) in the Axios response body (e.g. HTTP 400). */
export function extractLoginFlowFromError(e: unknown): LoginFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as LoginFlow;
  }
  return undefined;
}

export const useUpdateLoginFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: FrontendApiUpdateLoginFlowRequest) => {
      const res = await getKratosFrontendApi().updateLoginFlow(vars);
      return res.data;
    },
    onSuccess: () => {
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
