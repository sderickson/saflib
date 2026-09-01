import * as Sentry from "@sentry/vue";
import type { Session } from "@ory/client";
import { isLocalhostHostname } from "@saflib/errors-vue/lib/reportClientErrorToBackend.ts";

function isSentryClientEnabled(): boolean {
  return (
    !isLocalhostHostname() &&
    typeof import.meta.env.VITE_CLIENT_SENTRY_DSN === "string" &&
    import.meta.env.VITE_CLIENT_SENTRY_DSN.length > 0
  );
}

let identifiedUserId: string | undefined;

/**
 * Associate the current Kratos session with Sentry error reports. Call when the
 * session becomes available (e.g. from {@link DaemonLayout} on app load), mirroring
 * {@link identifyToPostHog}. Only the user id is sent — no email or name.
 */
export function identifyToSentry(session: Session): void {
  if (!isSentryClientEnabled()) {
    return;
  }

  const id = session.identity?.id;
  if (!id || identifiedUserId === id) {
    return;
  }

  Sentry.setUser({ id });
  identifiedUserId = id;
}

/** Clear Sentry user context when the session ends. */
export function resetSentryUser(): void {
  if (!isSentryClientEnabled()) {
    return;
  }

  Sentry.setUser(null);
  identifiedUserId = undefined;
}
