import { AxiosError, isAxiosError } from "axios";
import { useMutation } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateRegistrationFlowRequest,
  RegistrationFlow,
  SuccessfulNativeRegistration,
} from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";

/** Kratos may return an updated registration flow (validation errors) in the Axios response body (e.g. HTTP 400). */
export function extractRegistrationFlowFromError(
  e: unknown,
): RegistrationFlow | undefined {
  if (!isAxiosError(e)) return undefined;
  const d = e.response?.data;
  if (d && typeof d === "object" && "ui" in d && "id" in d) {
    return d as RegistrationFlow;
  }
  return undefined;
}

interface SuccessfulNativeRegistrationWrapped {
  response_type: "successful_native_registration";
  successful_native_registration: SuccessfulNativeRegistration;
}

interface RegistrationFlowWrapped {
  response_type: "registration_flow";
  registration_flow: RegistrationFlow;
}

export const useUpdateRegistrationFlowMutation = () => {
  return useMutation<
    SuccessfulNativeRegistrationWrapped | RegistrationFlowWrapped,
    AxiosError,
    FrontendApiUpdateRegistrationFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateRegistrationFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateRegistrationFlow(vars);
        return {
          response_type: "successful_native_registration",
          successful_native_registration: res.data,
        };
      } catch (e: unknown) {
        if (!(e instanceof AxiosError)) throw e;
        const flow = extractRegistrationFlowFromError(e);
        if (flow)
          return {
            response_type: "registration_flow",
            registration_flow: flow,
          };
        throw e;
      }
    },
  });
};
