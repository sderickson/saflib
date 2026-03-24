import type { User } from "./callbacks.ts";

/** Kratos identity object as embedded in courier `template_data.identity`. */
export interface KratosIdentityJson {
  id?: string;
  created_at?: string;
  updated_at?: string;
  traits?: Record<string, unknown>;
  verifiable_addresses?: Array<{ verified?: boolean; value?: string }>;
}

export function kratosIdentityToUser(identity: unknown): User {
  if (!identity || typeof identity !== "object") {
    return { id: "", email: "" };
  }
  const o = identity as KratosIdentityJson;
  const id = o.id ?? "";
  const traits = o.traits ?? {};
  const email =
    typeof traits.email === "string"
      ? traits.email
      : o.verifiable_addresses?.find((a) => a.value)?.value ?? "";
  const createdAt = o.created_at ? new Date(o.created_at) : undefined;
  const emailVerified = o.verifiable_addresses?.some((a) => a.verified) ?? false;
  return {
    id,
    email,
    createdAt,
    emailVerified,
    name: typeof traits.name === "string" ? traits.name : null,
    givenName: typeof traits.given_name === "string" ? traits.given_name : null,
    familyName: typeof traits.family_name === "string" ? traits.family_name : null,
  };
}
