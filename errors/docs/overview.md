# Overview

The errors suite captures client, server, and CSP errors into an in-memory ring buffer and exposes them for admin review and smoke testing.

`createErrorsRouter` is mounted on every API service that uses `@saflib/express` global middleware. Server errors are collected via `installReportedErrorCollector` (wired by `@saflib/vendors-sentry-node` `configureSentry()` at service boot). In production you should instead forward errors to a third-party service such as Sentry.

## Integration

The expected way to integrate these into your service is:

- Include the error router in your product's http package.
- Call `configureSentry()` (or `installReportedErrorCollector()` directly) at service startup to record server errors in the buffer.
- Add `@saflib/errors-vue` pages to the admin SPA for browsing reported errors and triggering test failures.

## Packages

| Package               | Role                                                           |
| --------------------- | -------------------------------------------------------------- |
| `@saflib/errors-spec` | OpenAPI spec and shared types                                  |
| `@saflib/errors-http` | In-memory ring buffer and Express routes                       |
| `@saflib/errors-sdk`  | TanStack Query hooks for recording and listing errors          |
| `@saflib/errors-vue`  | Client reporting helpers, smoke widgets, and admin Errors page |
