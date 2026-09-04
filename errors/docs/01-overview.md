# Overview

`errors` provides error **capture, storage, and viewing** for SAF applications — server-side error collectors wired into `@saflib/node`, browser CSP and client error ingestion, and development admin routes/pages. In development the default backend is an in-memory ring buffer; production swaps in vendor integrations (e.g. `@saflib/vendors-sentry-node` `configureSentry()`) via the same service abstraction.

## What this suite provides

| Package                  | Role                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `errors-spec`            | OpenAPI contracts for recording and listing reported errors      |
| `errors-service`         | `ErrorService` abstraction, in-memory mock, `configureMockErrors` |
| `errors-http`            | Express routers for dev/admin error APIs                         |
| `errors-sdk`             | TanStack Query client for recording and listing errors           |
| `errors-vue`             | Client error helpers, smoke widgets, and admin Errors page       |

## Integration

Server errors flow from [`getSafReporters().logError`](../../node/docs/02-instrumentation.md) and [`addErrorCollector`](../../node/docs/ref/index/functions/addErrorCollector.md) into `InMemoryErrorService` when `configureMockErrors()` runs at startup (development). Client errors and CSP violations POST through `errors-sdk` / `errors-vue` to the same store.

When the repo follows [base/service/http](../../base/docs/overview.md):

- Call `configureMockErrors()` from `@saflib/errors-service` at boot in development (base monolith does this automatically).
- Mount `createDevErrorsRouter` from `@saflib/errors-http` on the API in development.
- Add `@saflib/errors-vue` pages to the admin SPA for browsing reported errors.
- In production, call `configureSentry()` (or another vendor helper) to register a real `ErrorService`.

The HTTP app mounts errors routers alongside [node-log](../../node-log/docs/01-overview.md), [node-metrics](../../node-metrics/docs/01-overview.md), and [analytics](../../analytics/docs/01-overview.md) dev tooling.

