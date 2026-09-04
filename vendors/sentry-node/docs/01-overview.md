# Overview

`@saflib/vendors-sentry-node` wires [Sentry](https://sentry.io) as the production backend for [`@saflib/errors-service`](../../../errors/docs/01-overview.md) on Node services.

## What this package provides

- **`configureSentry()`** — idempotent startup helper; registers `SentryErrorService` when `SENTRY_DSN` is set (skipped for missing/`mock` DSN)
- **`SentryErrorService`** — implements `ErrorService`; forwards reported errors to Sentry and hooks `@saflib/node` error collectors
- **`resetErrorsForTests`** — clears the configured service in tests

## Integration

Call `configureSentry()` at process startup **before** servers start, after `setServiceName`. In development use [`configureMockErrors()`](../../../errors/docs/01-overview.md) from `@saflib/errors-service` instead.

Environment (see `env.schema.json`):

- **`SENTRY_DSN`** — project DSN; omit or set to `mock` to skip Sentry
- **`SENTRY_AUTH_TOKEN`** — build-time token for release/source-map upload (CI only)

## Further setup

Sentry org/project configuration and GitHub secrets are outside the repo. See [manual setup](./manual-setup.md).
