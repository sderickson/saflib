import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { FrontendApiUpdateSettingsFlowRequest, SettingsFlow } from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

/** Kratos may return an updated settings flow (validation errors) in the Axios response body (e.g. HTTP 400). */
export function extractSettingsFlowFromError(e: unknown): SettingsFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as SettingsFlow;
  }
  return undefined;
}

export const useUpdateSettingsFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: FrontendApiUpdateSettingsFlowRequest) => {
      const res = await getKratosFrontendApi().updateSettingsFlow(vars);
      return res.data;
    },
    onSuccess: () => {
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
