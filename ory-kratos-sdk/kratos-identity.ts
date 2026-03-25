import type { Identity } from "@ory/client";

/**
 * Whether the identity still has an unverified email address in Kratos
 * {@link Identity.verifiable_addresses} (browser session / whoami).
 */
export function identityNeedsEmailVerification(identity: Identity | undefined): boolean {
  if (!identity) return false;
  const addrs = identity.verifiable_addresses ?? [];
  const emailAddrs = addrs.filter((a) => a.via === "email");
  if (emailAddrs.length === 0) return false;
  return emailAddrs.some((a) => !a.verified);
}
