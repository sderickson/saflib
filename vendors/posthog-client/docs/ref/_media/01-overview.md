# Overview

`@saflib/vendors-posthog-client` loads PostHog in SAF web clients for feature flags, identify, and browser-side product event capture. Implements the browser side of [`@saflib/analytics`](../../../analytics/docs/01-overview.md).

## What this package provides

- **`initPostHogIfConfigured()`** — optional SPA init from `VITE_POSTHOG_*` build-time env
- **`makePosthogScriptTag()`** — Vite HTML plugin snippet for server-side env injection via `@saflib/env`
- **`usePostHog()` / `usePostHogFeatureFlag()`** — read flags from the global client
- **`identifyToPostHog(session)`** — call after Kratos session is available

## Product events

`@saflib/vue` emits product events through `commonEventLogger`, which forwards to any loaded `globalThis.posthog` client. This package does **not** own the event logger — it only loads PostHog so captures work.

1. **Load PostHog** — in `main.ts` call `initPostHogIfConfigured()`, or use `makePosthogScriptTag()` in your Vite build config.
2. **Emit events** — use your product's `clients/events.ts` (`makeProductEventLogger` → `commonEventLogger`).
3. **Dev backend buffer (optional)** — call `registerDevBackendProductEventConnector()` from `@saflib/analytics-vue` in `events.ts` for local admin visibility.

## Integration

Environment (see `env.schema.json`):

- **`VITE_POSTHOG_PROJECT_API_KEY`** — project API key at build time
- **`VITE_POSTHOG_PROJECT_HOST`** — ingest host (defaults to `https://us.i.posthog.com`)

Server-side analytics lives in [`@saflib/vendors-posthog`](../../posthog/docs/01-overview.md).
