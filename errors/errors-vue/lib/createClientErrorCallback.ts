import { createApp } from "vue";
import { reportClientErrorToBackend, reportUnhandledRejections } from "./reportClientErrorToBackend.ts";

export interface ClientErrorCallbackOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
}

/**
 * Vue `createApp` callback: log and report Vue errors and unhandled promise
 * rejections (see `reportClientErrorToBackend`). For Sentry, use `createSentryCallback` from
 * `@saflib/vendors-sentry-client`.
 */
export function createClientErrorCallback(
  options: ClientErrorCallbackOptions = {},
) {
  const source = options.source ?? "client";

  return function clientErrorCallback(app: ReturnType<typeof createApp>) {
    reportUnhandledRejections(source);
    const priorErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (error, instance, info) => {
      void reportClientErrorToBackend(error, { source, info });
      if (priorErrorHandler) {
        priorErrorHandler(error, instance, info);
      }
    };
  };
}
