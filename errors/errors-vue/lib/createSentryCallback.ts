import * as Sentry from "@sentry/vue";
import { createApp } from "vue";
import { reportClientErrorToBackend } from "./reportClientErrorToBackend.ts";

export interface SentryCallbackOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
}

/**
 * Vue `createApp` callback: always mirror Vue errors to `POST /errors/record`;
 * init Sentry when `VITE_CLIENT_SENTRY_DSN` is set (skipped on localhost).
 */
export function createSentryCallback(options: SentryCallbackOptions = {}) {
  const source = options.source ?? "client";

  return function sentryCallback(app: ReturnType<typeof createApp>) {
    const priorErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (error, instance, info) => {
      void reportClientErrorToBackend(error, { source });
      if (priorErrorHandler) {
        priorErrorHandler(error, instance, info);
      }
    };

    if (document.location.hostname.includes("localhost")) {
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
      beforeSend(event) {
        const message =
          event.message ??
          event.exception?.values?.[0]?.value ??
          "Unknown client error";
        void reportClientErrorToBackend(new Error(message), {
          source,
        });
        return event;
      },
    });
  };
}

/** @deprecated Use {@link createSentryCallback} for per-SPA source naming. */
export const sentryCallback = createSentryCallback();
