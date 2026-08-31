import { createApp } from "vue";
import { reportClientErrorToBackend } from "./reportClientErrorToBackend.ts";

export interface ClientErrorCallbackOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
}

/**
 * Vue `createApp` callback: log Vue errors (and POST `/errors/record` on
 * localhost hosts). For Sentry, use `createSentryCallback` from
 * `@saflib/vendors-sentry-client`.
 */
export function createClientErrorCallback(
  options: ClientErrorCallbackOptions = {},
) {
  const source = options.source ?? "client";

  return function clientErrorCallback(app: ReturnType<typeof createApp>) {
    const priorErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (error, instance, info) => {
      void reportClientErrorToBackend(error, { source, info });
      if (priorErrorHandler) {
        priorErrorHandler(error, instance, info);
      }
    };
  };
}
