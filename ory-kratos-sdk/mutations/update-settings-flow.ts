import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  FrontendApiUpdateSettingsFlowRequest,
  SettingsFlow,
} from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosSessionQueries } from "../kratos-session.ts";
import { BrowserRedirectRequired } from "../flow-results.ts";

export class SettingsFlowUpdated {
  constructor(readonly flow: SettingsFlow) {}
}

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
    SettingsFlowUpdated | BrowserRedirectRequired,
    TanstackError,
    FrontendApiUpdateSettingsFlowRequest
  >({
    mutationFn: async (vars: FrontendApiUpdateSettingsFlowRequest) => {
      try {
        const res = await getKratosFrontendApi().updateSettingsFlow(vars);
        return new SettingsFlowUpdated(res.data);
      } catch (e: unknown) {
        const flow = extractSettingsFlow(e);
        if (flow) return new SettingsFlowUpdated(flow);
        if (isAxiosError(e)) {
          const d = e.response?.data;
          if (
            d && typeof d === "object" &&
            !("ui" in d) &&
            "redirect_browser_to" in d
          ) {
            const url = (d as { redirect_browser_to?: string }).redirect_browser_to;
            if (typeof url === "string" && url.trim()) {
              return new BrowserRedirectRequired(url);
            }
          }
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
    onSuccess: (result) => {
      if (result instanceof SettingsFlowUpdated) {
        void invalidateKratosSessionQueries(queryClient);
      }
    },
  });
};
