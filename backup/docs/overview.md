# Overview

The backup suite provides a standalone backup service with its own HTTP API, SDK, and scheduled jobs.

Typical integration:

- Run `@saflib/backup-http` as a separate service.
- Use `@saflib/backup-sdk` in admin or tooling UIs.
- Schedule backup tasks via `@saflib/backup-cron`.

## Packages

| Package | Role |
| --- | --- |
| `@saflib/backup-spec` | OpenAPI spec and shared types |
| `@saflib/backup-http` | HTTP server |
| `@saflib/backup-sdk` | TanStack Query hooks and shared components |
| `@saflib/backup-cron` | Cron jobs for the backup service |
| `@saflib/backup-service-common` | Shared types and utilities |
