# Overview

The base suite is the golden product template that new SAF products fork from. It includes the monolith, HTTP service, admin and account SPAs, database schema, cron jobs, and shared dev tooling.

Typical layout:

- `@saflib/base-monolith` — main service entrypoint
- `@saflib/base-http` — Express routes and handlers
- `@saflib/base-db` — Drizzle schema and migrations
- `@saflib/base-*-spa` — client applications (admin, account, app, auth)
- `@saflib/base-dev` — local development scripts and workflows

Nested packages under `base/service/` and `base/clients/` wire cross-cutting concerns (audit, cron, email, jobs) into the golden product.
