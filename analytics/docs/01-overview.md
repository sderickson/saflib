# Overview

`analytics` provides **product event** helpers for SAF applications: a vendor-neutral `AnalyticsService` with typed event helpers on the server, and the browser event logger in `@saflib/vue`. Production sends events to a vendor (e.g. PostHog); look at them there.

It is separate from [`node-metrics`](../../node-metrics/docs/01-overview.md) (Prometheus/process metrics) and [`node-log`](../../node-log/docs/01-overview.md) (Winston operational logs).

## What this suite provides

- **`analytics-service`**: `AnalyticsService` abstraction, typed event helpers (`makeTypedAnalytics`), in-memory implementation for tests

## Integration

Server code uses `analytics-service`. Client SPAs emit through `makeProductEventLogger` / `commonEventLogger` from `@saflib/vue`, and a vendor client connector (e.g. PostHog) forwards them.

[`SafContext`](../../node/docs/ref/index/interfaces/SafContext.md) fields (auth, routing metadata) feed analytics attribution; [`runWithActingUser`](../../node/docs/ref/index/functions/runWithActingUser.md) attributes anonymous operations (webhooks, jobs) to the owning user for event context.

## Vendor implementations

Production backends implement `AnalyticsService` in vendor packages:

- [`@saflib/vendors-posthog`](../../vendors/posthog/docs/01-overview.md) — PostHog for server-side events
- [`@saflib/vendors-posthog-client`](../../vendors/posthog-client/docs/01-overview.md) — PostHog browser init, feature flags, and client events

Call `configureAnalytics()` at startup in production.
