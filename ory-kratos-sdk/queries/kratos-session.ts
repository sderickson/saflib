import type { Session } from "@ory/client";
import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { getKratosFrontendApi } from "../kratos-client.ts";

const kratosSessionQueryKey = ["kratos", "session"] as const;

/** FrontendApi `toSession` (browser cookies). 401 resolves to `null` (not authenticated). */
async function fetchKratosSession(): Promise<Session | null> {
  try {
    const res = await getKratosFrontendApi().toSession();
    return res.data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 401) {
      return null;
    }
    throw e;
  }
}

export const kratosSessionQueryOptions = () =>
  queryOptions({
    queryKey: kratosSessionQueryKey,
    queryFn: fetchKratosSession,
    staleTime: 30_000,
  });

/** Cached Kratos session. `data === null` means not authenticated (including 401). */
export function useKratosSession() {
  return useQuery(kratosSessionQueryOptions());
}

/** After login, register, or logout — refetches both optional and required session queries. */
export function invalidateKratosSessionQueries(qc: QueryClient) {
  return qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "kratos" &&
      q.queryKey[1] === "session",
  });
}

/** Invalidate after login, register, or logout so `useKratosSession` refetches. */
export function useInvalidateKratosSession() {
  const qc = useQueryClient();
  return () => void invalidateKratosSessionQueries(qc);
}
