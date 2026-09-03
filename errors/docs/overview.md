# Overview

The errors suite helps with debugging errors and error capture in development, and recording CSP violations and testing error reporting in production.

It provides:

- An `ErrorService` abstraction with an in-memory mock for development
- Express routes for recording and listing errors in the ring buffer
- Client-side reporting helpers and an admin Errors page

In development, `@saflib/base-monolith` calls `configureMockErrors()` and mounts the mock error routes. In production, wire a real implementation such as `@saflib/vendors-sentry-node` `configureSentry()` at service startup.

## Package structure and integration

The expected way to integrate these into your service is:

- Call `configureMockErrors()` from `@saflib/errors-service` at boot in development.
- Mount `createDevErrorsRouter` from `@saflib/errors-http` on your API in development.
- Add `@saflib/errors-vue` pages to the admin SPA for browsing reported errors.
- In production, call `configureSentry()` (or another vendor helper) to register a real `ErrorService`.

## Packages

| Package                  | Role                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `@saflib/errors-spec`    | OpenAPI spec and shared types                                  |
| `@saflib/errors-service` | `ErrorService` abstraction and in-memory mock                  |
| `@saflib/errors-http`    | Express routes backed by the configured error service          |
| `@saflib/errors-sdk`     | TanStack Query hooks for recording and listing errors          |
| `@saflib/errors-vue`     | Client reporting helpers, smoke widgets, and admin Errors page |
