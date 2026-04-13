import type { Session } from "@ory/client";

/** Display email from traits or the first email verifiable address. */
export function sessionDisplayEmail(session: Session): string {
  const traits = session.identity?.traits as { email?: string } | undefined;
  if (traits?.email) return traits.email;
  const addr = session.identity?.verifiable_addresses?.find((a) => a.via === "email");
  return addr?.value ?? "";
}
