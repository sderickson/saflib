import { isAxiosError } from "axios";
import {
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/vue-query";
import type { Session } from "@ory/client";
import { getKratosFrontendApi } from "./kratos-client.ts";

export const kratosSessionQueryKey = ["kratos", "session"] as const;

/** Same session fetch as `kratosSessionQueryOptions`, but missing session throws (status 401) for AsyncPage / loaders that require a logged-in user. */
export const kratosSessionRequiredQueryKey = [
  "kratos",
  "session",
  "required",
] as const;

export async function fetchKratosSession(): Promise<Session | null> {
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

/** Email from Kratos identity traits (browser session). */
export function kratosIdentityEmail(
  session: Session | null | undefined,
): string | undefined {
  const traits = session?.identity?.traits as { email?: string } | undefined;
  return traits?.email;
}

/** Loader guard: session must include identity (required-session query succeeded). */
export function assertKratosSessionIdentityLoaded(
  session: unknown,
): asserts session is Session {
  if (!session || !(session as Session).identity) {
    throw new Error("Failed to load session");
  }
}

/** FrontendApi `toSession` (browser cookies). 401 resolves to `null` (not authenticated). */
export const kratosSessionQueryOptions = () =>
  queryOptions({
    queryKey: kratosSessionQueryKey,
    queryFn: fetchKratosSession,
    staleTime: 30_000,
  });

function notLoggedInError(): Error & { status: number } {
  const e = new Error("Not logged in") as Error & { status: number };
  e.status = 401;
  return e;
}

export const kratosSessionRequiredQueryOptions = () =>
  queryOptions({
    queryKey: kratosSessionRequiredQueryKey,
    queryFn: async () => {
      const session = await fetchKratosSession();
      if (!session?.identity) {
        throw notLoggedInError();
      }
      return session;
    },
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
