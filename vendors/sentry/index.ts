/**
 * `@saflib/vendors-sentry` — Sentry Node/Vue adapters, Vite source-map upload
 * (`./vite-build`), and env schema (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`).
 */
export {
  configureSentry,
  initSentry,
  initErrorsServer,
  type ConfigureSentryOptions,
} from "./configureSentry.ts";
export {
  createSentryCallback,
  sentryCallback,
  type SentryCallbackOptions,
} from "./createSentryCallback.ts";
