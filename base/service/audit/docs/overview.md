# Overview

`@saflib/base-audit` wires audit logging into the base golden product. It connects `@saflib/audit-http` and `@saflib/audit-db` to the base service context.

Exports:

- `baseAuditMap` — per-route opt-in audit events (keyed by `"METHOD /route"`).
- `baseAuditRecorderMiddleware()` — Express middleware that records audit events.
- `createBaseAuditRouter()` — admin API for browsing the audit log.
- `getBaseAuditDbKey()` — separate on-disk DB key for audit storage.

Add entries to `audit-map.ts` when shipping new routes that should be audited.
