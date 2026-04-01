import type { Session } from "@ory/client";

/** Post-verification destination: `?return_to=` when set, otherwise the injected hub app fallback URL. */
export function resolveVerifyWallReturnToDestination(
  returnToQueryParam: unknown,
  fallbackRecipesHomeHref: string,
): string {
  if (typeof returnToQueryParam === "string" && returnToQueryParam.trim()) {
    return returnToQueryParam.trim();
  }
  return fallbackRecipesHomeHref;
}

/** Display email from traits or the first email verifiable address. */
export function sessionDisplayEmail(session: Session): string {
  const traits = session.identity?.traits as { email?: string } | undefined;
  if (traits?.email) return traits.email;
  const addr = session.identity?.verifiable_addresses?.find((a) => a.via === "email");
  return addr?.value ?? "";
}
