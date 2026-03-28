import { AxiosError, isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateVerificationFlowRequest,
  VerificationFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosSessionQueries } from "../queries/kratos-session.ts";
import {
  VerificationFlowFetched,
  getVerificationFlowQueryKey,
} from "../queries/get-verification-flow.ts";

export class VerificationFlowUpdated {
  constructor(readonly flow: VerificationFlow) {}
}

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
    VerificationFlowUpdated,
    TanstackError,
    FrontendApiUpdateVerificationFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateVerificationFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateVerificationFlow(vars);
        return new VerificationFlowUpdated(res.data);
      } catch (e: unknown) {
        const flow = extractVerificationFlow(e);
        if (flow) return new VerificationFlowUpdated(flow);
        if (e instanceof AxiosError) {
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        getVerificationFlowQueryKey(result.flow.id),
        new VerificationFlowFetched(result.flow),
      );
      void invalidateKratosSessionQueries(queryClient);
    },
  });
};
