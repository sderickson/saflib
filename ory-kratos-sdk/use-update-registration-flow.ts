import { AxiosError, isAxiosError } from "axios";
import { useMutation } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateRegistrationFlowRequest,
  RegistrationFlow,
  SuccessfulNativeRegistration,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "./kratos-client.ts";

export class RegistrationFlowUpdated {
  constructor(readonly flow: RegistrationFlow) {}
}

export class RegistrationCompleted {
  constructor(readonly result: SuccessfulNativeRegistration) {}
}

function extractRegistrationFlow(e: unknown): RegistrationFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as RegistrationFlow;
  }
  return undefined;
}

export const useUpdateRegistrationFlowMutation = () => {
  return useMutation<
    RegistrationFlowUpdated | RegistrationCompleted,
    TanstackError,
    FrontendApiUpdateRegistrationFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateRegistrationFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateRegistrationFlow(vars);
        return new RegistrationCompleted(res.data);
      } catch (e: unknown) {
        const flow = extractRegistrationFlow(e);
        if (flow) return new RegistrationFlowUpdated(flow);
        if (e instanceof AxiosError) {
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
  });
};
