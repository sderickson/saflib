import { createApp } from "vue";
import { reportClientErrorToBackend } from "./reportClientErrorToBackend.ts";

export interface ClientErrorCallbackOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
}

/**
 * Vue `createApp` callback: mirror Vue errors to `POST /errors/record`.
 * For Sentry, use `createSentryCallback` from `@saflib/vendors-sentry`.
 */
export function createClientErrorCallback(
  options: ClientErrorCallbackOptions = {},
) {
  const source = options.source ?? "client";

  return function clientErrorCallback(app: ReturnType<typeof createApp>) {
    const priorErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (error, instance, info) => {
      void reportClientErrorToBackend(error, { source });
      if (priorErrorHandler) {
        priorErrorHandler(error, instance, info);
      }
    };
  };
}
