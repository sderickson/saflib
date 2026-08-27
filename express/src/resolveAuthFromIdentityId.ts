import type { Auth } from "@saflib/node";
import { kratosAdminBaseUrl } from "./kratos-admin.ts";

interface KratosIdentityTraits {
  email?: string;
  phone?: string;
}

interface KratosVerifiableAddress {
  via?: string;
  verified?: boolean;
}

interface KratosIdentity {
  id: string;
  state?: string;
  traits?: KratosIdentityTraits;
  verifiable_addresses?: KratosVerifiableAddress[];
}

/**
 * Resolve a fresh `Auth` (from `@saflib/node`) for `userId` via the Kratos admin API.
 *
 * Returns `null` only when the identity is definitively unresolvable: missing
 * (404), inactive, or unmappable to Auth (e.g. no email trait). Transient
 * failures (network errors, non-404 error statuses) **throw** so callers can
 * surface a retryable 5xx instead of treating the user as gone — important for
 * the jobs runtime, where "auth unresolvable" is a terminal state.
 *
 * Does **not** set `mfaCompleted` — that comes from the identity assertion
 * (session-scoped).
 */
export async function resolveAuthFromIdentityId(
  userId: string,
): Promise<Auth | null> {
  const url = `${kratosAdminBaseUrl()}/admin/identities/${encodeURIComponent(userId)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Kratos admin identity lookup failed: ${res.status}`);
  }

  const identity = (await res.json()) as KratosIdentity;
  if (identity.state !== "active") {
    return null;
  }

  const traits = identity.traits ?? {};
  const userEmail = traits.email;
  if (!userEmail) {
    return null;
  }

  const userPhone =
    typeof traits.phone === "string" && traits.phone.trim()
      ? traits.phone
      : undefined;

  const verifiableAddresses = identity.verifiable_addresses ?? [];
  const emailVerified =
    verifiableAddresses.find((a) => a.via === "email")?.verified ?? false;

  const adminRaw = process.env.ADMIN_EMAILS ?? "";
  const adminEmails = new Set(
    adminRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
  const isAdmin = adminEmails.has(userEmail) && emailVerified;

  return {
    userId: identity.id,
    userEmail,
    userPhone,
    isAdmin,
    emailVerified,
  };
}
