import type { Identity, Session } from "@ory/client";

/** Email from Kratos identity traits (browser session). */
export function kratosIdentityEmail(
  session: Session | null | undefined,
): string | undefined {
  const traits = session?.identity?.traits as { email?: string } | undefined;
  return traits?.email;
}

export function kratosEmailFromIdentity(
  identity: Identity,
): string | undefined {
  return identity.traits?.email;
}

/** Loader guard: session must include identity (required-session query succeeded). */
export function assertKratosSessionIdentityLoaded(
  session: unknown,
): asserts session is Session {
  if (!session || !(session as Session).identity) {
    throw new Error("Failed to load session");
  }
}
