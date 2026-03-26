import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  ErrorAuthenticatorAssuranceLevelNotSatisfied,
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

function extractAalNotSatisfied(
  e: unknown,
): ErrorAuthenticatorAssuranceLevelNotSatisfied | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (!d || typeof d !== "object") return undefined;
  if ("ui" in d) return undefined;
  if ("redirect_browser_to" in d) {
    return d as ErrorAuthenticatorAssuranceLevelNotSatisfied;
  }
  return undefined;
}

export const useUpdateSettingsFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SettingsFlow | ErrorAuthenticatorAssuranceLevelNotSatisfied,
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
        const aalNotSatisfied = extractAalNotSatisfied(e);
        if (aalNotSatisfied) return aalNotSatisfied;
        if (e instanceof AxiosError) {
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    onSuccess: (result) => {
      if ("ui" in result) {
        void invalidateKratosSessionQueries(queryClient);
      }
    },
  });
};
