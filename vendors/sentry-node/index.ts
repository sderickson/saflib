/**
 * `@saflib/vendors-sentry-node` — Sentry Node adapters, Vite source-map upload
 * (`./vite-build`), and env schema (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`).
 *
 * Do not import this package from browser/SPA code — use
 * `@saflib/vendors-sentry-client` instead.
 */
export {
  configureSentry,
  initSentry,
  initErrorsServer,
  type ConfigureSentryOptions,
} from "./configureSentry.ts";
