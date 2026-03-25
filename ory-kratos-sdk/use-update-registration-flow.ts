import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/vue-query";
import type { FrontendApiUpdateRegistrationFlowRequest, RegistrationFlow } from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";

/** Kratos may return an updated registration flow (validation errors) in the Axios response body (e.g. HTTP 400). */
export function extractRegistrationFlowFromError(e: unknown): RegistrationFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as RegistrationFlow;
  }
  return undefined;
}

export const useUpdateRegistrationFlowMutation = () => {
  return useMutation({
    mutationFn: async (vars: FrontendApiUpdateRegistrationFlowRequest) => {
      const res = await getKratosFrontendApi().updateRegistrationFlow(vars);
      return res.data;
    },
  });
};
