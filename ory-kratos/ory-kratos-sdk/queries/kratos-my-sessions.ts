import type { Session } from "@ory/client";
import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import type { Ref } from "vue";
import { getKratosFrontendApi } from "../kratos-client.ts";

export const kratosMySessionsQueryKey = ["kratos", "my-sessions"] as const;

async function fetchKratosMySessions(): Promise<Session[]> {
  try {
    const res = await getKratosFrontendApi().listMySessions({});
    return res.data ?? [];
  } catch (e) {
    if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
    throw e;
  }
}

export interface KratosMySessionsQueryOptions {
  enabled?: Ref<boolean>;
}

export const kratosMySessionsQueryOptions = (
  options?: KratosMySessionsQueryOptions,
) =>
  queryOptions<Session[], TanstackError>({
    queryKey: kratosMySessionsQueryKey,
    queryFn: fetchKratosMySessions,
    staleTime: 10_000,
    enabled: options?.enabled,
  });

export function useKratosMySessions(options?: KratosMySessionsQueryOptions) {
  return useQuery(kratosMySessionsQueryOptions(options));
}

export function invalidateKratosMySessionsQueries(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: kratosMySessionsQueryKey });
}

export function useInvalidateKratosMySessions() {
  const qc = useQueryClient();
  return () => void invalidateKratosMySessionsQueries(qc);
}
