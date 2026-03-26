import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateVerificationFlowRequest,
  VerificationFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { invalidateKratosSessionQueries } from "./kratos-session.ts";

function extractVerificationFlow(e: unknown): VerificationFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as VerificationFlow;
  }
  return undefined;
}

export const useUpdateVerificationFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    VerificationFlow,
    TanstackError,
    FrontendApiUpdateVerificationFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateVerificationFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateVerificationFlow(vars);
        return res.data;
      } catch (e: unknown) {
        const flow = extractVerificationFlow(e);
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
