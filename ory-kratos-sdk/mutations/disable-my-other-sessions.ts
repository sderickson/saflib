import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosMySessionsQueries } from "../queries/kratos-my-sessions.ts";

export function useDisableMyOtherSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, TanstackError, void>({
    mutationFn: async () => {
      try {
        await getKratosFrontendApi().disableMyOtherSessions({});
      } catch (e) {
        if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
        throw e;
      }
    },
    onSuccess: async () => {
      void invalidateKratosMySessionsQueries(queryClient);
    },
  });
}
