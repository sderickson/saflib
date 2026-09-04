import type { Session } from "@ory/client";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import { getKratosFrontendApi } from "../kratos-client.ts";
import { invalidateKratosMySessionsQueries } from "../queries/kratos-my-sessions.ts";
import {
  invalidateKratosSessionQueries,
  kratosSessionQueryKey,
} from "../queries/kratos-session.ts";

export function useDisableMySessionMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, TanstackError, string>({
    mutationFn: async (id: string) => {
      try {
        await getKratosFrontendApi().disableMySession({ id });
      } catch (e) {
        if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
        throw e;
      }
    },
    onSuccess: async (_data, id) => {
      void invalidateKratosMySessionsQueries(queryClient);
      const current = queryClient.getQueryData<Session | null>(
        kratosSessionQueryKey,
      );
      if (current?.id === id) {
        void invalidateKratosSessionQueries(queryClient);
      }
    },
  });
}
