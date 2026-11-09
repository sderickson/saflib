import type { Session } from "@ory/client";

/** True when this session completed a TOTP or WebAuthn step (proxy for MFA already linked). */
export function sessionHasSecondFactorAuthenticationMethod(
  session: Session | null | undefined,
): boolean {
  const methods = session?.authentication_methods;
  if (!methods?.length) {
    return false;
  }
  return methods.some(
    (method) => method.method === "totp" || method.method === "webauthn",
  );
}
