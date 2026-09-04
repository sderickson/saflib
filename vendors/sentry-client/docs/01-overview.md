# Overview

`@saflib/vendors-sentry-client` provides Sentry Vue/browser adapters for SAF SPAs. Safe to import from Vite client bundles — never depends on `@sentry/node`.

Implements the browser side of [`@saflib/errors`](../../../errors/docs/01-overview.md) alongside `@saflib/errors-vue`.

## What this package provides

- **`createSentryCallback()`** — Vue `createApp` callback: initializes Sentry when `VITE_CLIENT_SENTRY_DSN` is set; always POSTs client errors to `/errors/record` on localhost hosts
- **`identifyToSentry()` / `resetSentryUser()`** — attach or clear user context after auth session is available
- **`sanitizeTelemetryEvent`** integration — strips sensitive fields before Sentry upload

## Integration

Pass `createSentryCallback({ source: "app" })` (or your SPA name) into your client bootstrap alongside other app callbacks. Sentry is skipped on `*.localhost` and when the DSN env var is unset.

Environment:

- **`VITE_CLIENT_SENTRY_DSN`** — browser project DSN at build time

Server-side Sentry for Node services lives in [`@saflib/vendors-sentry-node`](../sentry-node/docs/01-overview.md).
