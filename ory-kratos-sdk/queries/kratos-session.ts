import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/vue-query";
import { fetchKratosSession } from "../helpers/fetch-kratos-session.ts";

const kratosSessionQueryKey = ["kratos", "session"] as const;

/** FrontendApi `toSession` (browser cookies). 401 resolves to `null` (not authenticated). */
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
