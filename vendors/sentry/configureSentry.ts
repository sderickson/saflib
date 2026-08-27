import * as Sentry from "@sentry/node";
import { addErrorCollector, getSafReporters } from "@saflib/node";
import { installReportedErrorCollector } from "@saflib/errors-http";
import { typedEnv } from "./env.ts";

export type ConfigureSentryOptions = {
  sendDefaultPii?: boolean;
};

/**
 * Wire the error ring buffer and optional Sentry forwarding for Node services.
 * Idempotent for the buffer collector; Sentry init skips when DSN is missing or `"mock"`.
 */
export function configureSentry(options: ConfigureSentryOptions = {}): void {
  const { log } = getSafReporters();

  installReportedErrorCollector();

  const dsn = typedEnv.SENTRY_DSN;
  if (dsn === "mock" || !dsn) {
    return;
  }

  const sendDefaultPii = options.sendDefaultPii ?? false;

  Sentry.init({
    dsn,
    sendDefaultPii,
  });

  addErrorCollector(({ error, level, extra, tags, user }) => {
    Sentry.captureException(error, {
      level,
      extra,
      tags,
      user,
    });
  });

  log.info(`Sentry initialized with DSN: ${dsn.slice(0, 16) + "..."}`);
}

/** @deprecated Use {@link configureSentry}. */
export const initSentry = configureSentry;

/** @deprecated Use {@link configureSentry}. */
export const initErrorsServer = configureSentry;
