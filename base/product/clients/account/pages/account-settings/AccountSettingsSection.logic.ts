import type { Session } from "@ory/client";

/** True when this session completed a TOTP step (proxy for MFA already linked). */
export function sessionHasTotpAuthenticationMethod(
  session: Session | null | undefined,
): boolean {
  const methods = session?.authentication_methods;
  if (!methods?.length) {
    return false;
  }
  return methods.some((method) => method.method === "totp");
}
