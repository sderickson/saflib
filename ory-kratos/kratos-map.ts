import type { User } from "./callbacks.ts";

/** Kratos identity object as embedded in courier `template_data.identity`. */
export interface KratosIdentityJson {
  id?: string;
  created_at?: string;
  updated_at?: string;
  traits?: Record<string, unknown>;
  verifiable_addresses?: Array<{ verified?: boolean; value?: string }>;
}

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Map Kratos identity + recipient email into a `User`.
 * When `recipientEmail` matches a `verifiable_addresses[].value`, that entry's `verified` flag is used for `emailVerified`.
 */
export function kratosIdentityToUser(
  identity: unknown,
  recipientEmail: string,
): User {
  const want = normalizeEmail(recipientEmail);
  if (!identity || typeof identity !== "object") {
    return { id: "", email: recipientEmail };
  }
  const o = identity as KratosIdentityJson;
  const id = o.id ?? "";
  const traits = o.traits ?? {};
  const traitEmail =
    typeof traits.email === "string" ? traits.email : "";

  let email = traitEmail || recipientEmail;
  let emailVerified: boolean | null | undefined;

  const addrs = o.verifiable_addresses;
  if (addrs?.length && want) {
    const match = addrs.find(
      (a) => a.value && normalizeEmail(a.value) === want,
    );
    if (match) {
      email = match.value ?? email;
      emailVerified = match.verified === true;
    } else {
      emailVerified = false;
    }
  }

  const createdAt = o.created_at ? new Date(o.created_at) : undefined;

  return {
    id,
    email,
    createdAt,
    emailVerified,
    name: typeof traits.name === "string" ? traits.name : null,
    givenName: typeof traits.given_name === "string" ? traits.given_name : null,
    familyName:
      typeof traits.family_name === "string" ? traits.family_name : null,
  };
}
