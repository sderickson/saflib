# Overview

`analytics` provides **product event** capture, storage, and viewing for SAF applications — browser event logging, server-side typed analytics helpers, and development admin routes/pages. In development events land in an in-memory ring buffer; production swaps in vendor integrations (e.g. PostHog) via the same service abstraction.

Like [`errors`](../../errors/docs/01-overview.md), this suite spans client and server. It is separate from [`node-metrics`](../../node-metrics/docs/01-overview.md) (Prometheus/process metrics) and [`node-log`](../../node-log/docs/01-overview.md) (Winston operational logs).

## What this suite provides

- **`analytics-spec`** — OpenAPI contracts for recording and listing product events
- **`analytics-service`** — `AnalyticsService` abstraction, typed event helpers, in-memory implementation for tests
- **`analytics-http`** — in-memory event buffer and dev Express router (`createDevAnalyticsRouter`)
- **`analytics-sdk`** — TanStack Query client for recording and listing events
- **`analytics-vue`** — client event logger and admin Events page

## Integration

Client SPAs call `analytics-sdk` / `analytics-vue` to POST product events to `/product-events/record`. Server code uses `analytics-service` (typed `makeTypedAnalytics`) and can call `recordProductEvent` with `source: "server"` in development.

[`SafContext`](../../node/docs/ref/index/interfaces/SafContext.md) fields (auth, routing metadata) feed analytics attribution; [`runWithActingUser`](../../node/docs/ref/index/functions/runWithActingUser.md) attributes anonymous operations (webhooks, jobs) to the owning user for event context.

When the repo follows [base/service/http](../../base/docs/overview.md), the HTTP app mounts `createDevAnalyticsRouter()` alongside [node-log](../../node-log/docs/01-overview.md), [node-metrics](../../node-metrics/docs/01-overview.md), and [errors](../../errors/docs/01-overview.md) dev tooling. The admin SPA lists buffered events since process start.
