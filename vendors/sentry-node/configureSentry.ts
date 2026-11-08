import {
  hasErrorService,
  setErrorService,
  resetErrorServiceForTests,
} from "@saflib/errors-service";
import type { SentryErrorServiceOptions } from "./SentryErrorService.ts";
import { typedEnv } from "./env.ts";

export type ConfigureSentryOptions = SentryErrorServiceOptions;

/**
 * Wire Sentry as the process-level error service when `SENTRY_DSN` is set.
 * Skips when the DSN is missing or `"mock"`. Idempotent — subsequent calls are no-ops.
 * `@sentry/node` (~20MB and most of a second to load) is only imported when
 * Sentry is actually configured.
 *
 * For local development, use `@saflib/errors-service` `configureMockErrors()` instead.
 */
export async function configureSentry(
  options: ConfigureSentryOptions = {},
): Promise<void> {
  if (hasErrorService()) {
    return;
  }

  const dsn = typedEnv.SENTRY_DSN;
  if (dsn === "mock" || !dsn) {
    return;
  }

  const { SentryErrorService } = await import("./SentryErrorService.ts");
  setErrorService(new SentryErrorService(options));
}

/** @deprecated Use {@link configureSentry}. */
export const initSentry = configureSentry;

/** @deprecated Use {@link configureSentry}. */
export const initErrorsServer = configureSentry;

export { resetErrorServiceForTests as resetErrorsForTests };
