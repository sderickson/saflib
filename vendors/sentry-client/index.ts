/**
 * `@saflib/vendors-sentry-client` — Sentry Vue/browser adapters for SPAs.
 *
 * Safe to import from Vite client bundles. Never depends on `@sentry/node`.
 */
export {
  createSentryCallback,
  sentryCallback,
  type SentryCallbackOptions,
} from "./createSentryCallback.ts";
