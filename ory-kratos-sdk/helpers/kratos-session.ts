import type { Session } from "@ory/client";

/** Email from Kratos identity traits (browser session). */
export function kratosEmailFromSession(
  session: Session | null | undefined,
): string | undefined {
  const traits = session?.identity?.traits as { email?: string } | undefined;
  return traits?.email;
}

export function kratosEmailVerifiedFromSession(
  session: Session | null | undefined,
): boolean {
  const email = kratosEmailFromSession(session);
  const addr = session?.identity?.verifiable_addresses?.find(
    (a) => a.value === email,
  );
  if (!addr) return false;
  return addr.verified ?? false;
}

/** Loader guard: session must include identity (required-session query succeeded). */
export function assertKratosSessionIdentityLoaded(
  session: unknown,
): asserts session is Session {
  if (!session || !(session as Session).identity) {
    throw new Error("Failed to load session");
  }
}
