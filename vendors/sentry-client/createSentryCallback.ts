import * as Sentry from "@sentry/vue";
import { createApp } from "vue";
import {
  isLocalhostHostname,
  reportClientErrorToBackend,
} from "@saflib/errors-vue/lib/reportClientErrorToBackend.ts";

export interface SentryCallbackOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
}

/**
 * Vue `createApp` callback: log Vue errors (and POST `/errors/record` on
 * localhost hosts). Init Sentry when `VITE_CLIENT_SENTRY_DSN` is set (skipped
 * on `*.localhost`).
 */
export function createSentryCallback(options: SentryCallbackOptions = {}) {
  const source = options.source ?? "client";

  return function sentryCallback(app: ReturnType<typeof createApp>) {
    const priorErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (error, instance, info) => {
      void reportClientErrorToBackend(error, { source, info });
      if (priorErrorHandler) {
        priorErrorHandler(error, instance, info);
      }
    };

    if (isLocalhostHostname()) {
      console.log("Sentry disabled for localhost");
      return;
    }
    if (!import.meta.env.VITE_CLIENT_SENTRY_DSN) {
      console.log("Sentry disabled for missing VITE_CLIENT_SENTRY_DSN");
      return;
    }

    Sentry.init({
      app,
      dsn: import.meta.env.VITE_CLIENT_SENTRY_DSN,
      sendDefaultPii: true,
    });
  };
}

/** @deprecated Use {@link createSentryCallback} for per-SPA source naming. */
export const sentryCallback = createSentryCallback();
