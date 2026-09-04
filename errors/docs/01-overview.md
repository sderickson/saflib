# Overview

`errors` provides error **capture, storage, and viewing** for SAF applications — server-side error collectors wired into `@saflib/node`, browser CSP and client error ingestion, and development admin routes/pages. In development the default backend is an in-memory ring buffer; production swaps in vendor integrations (e.g. Sentry) via the same service abstraction.

This is intentionally **not** prefixed with `node-`: unlike metrics and logs dev viewers, error reporting spans browser and server (`errors-vue`, `errors-sdk`, CSP reports, and `addErrorCollector` on the backend).

## What this suite provides

- **`errors-spec`** — OpenAPI contracts for recording and listing reported errors
- **`errors-service`** — `ErrorService` abstraction, in-memory implementation, `configureMockErrors` for development
- **`errors-http`** — Express routers for dev/admin error APIs (`createErrorsRouter`, `createDevErrorsRouter`)
- **`errors-sdk`** — TanStack Query client for recording and listing errors
- **`errors-vue`** — client error helpers, smoke widgets, and admin Errors page

## Integration

Server errors flow from [`getSafReporters().logError`](../../node/docs/02-instrumentation.md) and [`addErrorCollector`](../../node/docs/ref/index/functions/addErrorCollector.md) into `InMemoryErrorService` when `configureMockErrors()` runs at startup (development). Client errors and CSP violations POST through `errors-sdk` / `errors-vue` to the same store.

When the repo follows [base/service/http](../../base/docs/overview.md), the HTTP app mounts the errors routers alongside [node-log](../../node-log/docs/01-overview.md) and [node-metrics](../../node-metrics/docs/01-overview.md) dev tooling.

## Naming

Keep the suite folder as **`errors`**, not `node-errors`:

- Browser CSP and client-reported errors are first-class (`errors-vue`, `errors-sdk`)
- `node-metrics` and `node-log` are narrowly **server dev viewers** for Prometheus and Winston — the `node-` prefix fits there
- Shortening to `metrics` / `logs` / `errors` at the repo root would be too generic next to product analytics and unrelated error types

If a future suite needed distinct browser vs server error packages, split by role (`errors-client`, `errors-service`) rather than folding everything under `node-`.
