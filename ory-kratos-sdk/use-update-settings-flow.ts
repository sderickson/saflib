import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateSettingsFlowRequest,
  SettingsFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

function extractSettingsFlow(e: unknown): SettingsFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as SettingsFlow;
  }
  return undefined;
}

export const useUpdateSettingsFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SettingsFlow,
    TanstackError,
    FrontendApiUpdateSettingsFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateSettingsFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateSettingsFlow(vars);
        return res.data;
      } catch (e: unknown) {
        const flow = extractSettingsFlow(e);
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
