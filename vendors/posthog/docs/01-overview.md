# Overview

`@saflib/vendors-posthog` wires [PostHog](https://posthog.com) as the production backend for [`@saflib/analytics-service`](../../../analytics/docs/01-overview.md) on Node services.

## What this package provides

- **`configureAnalytics()`** — idempotent startup helper; registers `PosthogAnalyticsService` or falls back to in-memory when the API key is missing/`mock` or `NODE_ENV=test`
- **`PosthogAnalyticsService`** — implements `AnalyticsService`; captures server-side product events via PostHog's HTTP API
- **`getAnalyticsClient()` / `resetAnalyticsForTests`** — read or reset the configured client

## Integration

Call `configureAnalytics()` at process startup before handling requests. In development the in-memory buffer from `@saflib/analytics-http` is used when PostHog is not configured.

Environment (see `env.schema.json`):

- **`POSTHOG_PROJECT_API_KEY`** — project API key; omit, leave empty, or set to `mock` for in-memory
- **`POSTHOG_PROJECT_HOST`** — ingest host (defaults to `https://us.i.posthog.com`)

Browser PostHog loading and feature flags live in [`@saflib/vendors-posthog-client`](../../posthog-client/docs/01-overview.md).
