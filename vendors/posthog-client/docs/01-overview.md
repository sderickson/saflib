# Overview

`@saflib/vendors-posthog-client` loads PostHog in SAF web clients for feature flags, identify, and browser-side product event capture. Implements the browser side of [`@saflib/analytics`](../../../analytics/docs/01-overview.md).

## What this package provides

- **`initPostHogIfConfigured(options?)`** — preferred SPA init from `VITE_POSTHOG_*` (bundled `posthog-js`; CSP-friendly). Defaults are cookieless (`cookieless_mode: "always"`), no session recording, and `person_profiles: "never"` (no cookie banner). Pass PostHog config overrides to change that.
- **`makePosthogScriptTag()`** — legacy Vite HTML inline snippet (requires `script-src 'unsafe-inline'`; avoid for new products). Server-side env injection via `@saflib/env`.
- **`usePostHog()` / `usePostHogFeatureFlag()`** — read flags from the global client
- **`identifyToPostHog(session)`** — call after Kratos session is available

Cookieless mode must also be enabled under PostHog **Project settings → Web analytics → Cookieless server hash mode**, or events are ignored at ingest.

## Product events

`@saflib/vue` emits product events through `commonEventLogger`, which forwards to any loaded `globalThis.posthog` client. This package does **not** own the event logger — it only loads PostHog so captures work.

1. **Load PostHog** — in `main.ts` / the VitePress theme call `initPostHogIfConfigured({ apiKey: import.meta.env.VITE_POSTHOG_PROJECT_API_KEY, apiHost: import.meta.env.VITE_POSTHOG_PROJECT_HOST })`. Prefer this over `makePosthogScriptTag()` so CSP can omit `'unsafe-inline'`. Pass the `VITE_*` values from **app** source so Vite inlines them (env reads inside this package are not substituted in production builds).
2. **Emit events** — use your product's `clients/events.ts` (`makeProductEventLogger` → `commonEventLogger`).
3. **Dev backend buffer (optional)** — call `registerDevBackendProductEventConnector()` from `@saflib/analytics-vue` in `events.ts` for local admin visibility.

## Integration

Environment (see `env.schema.json` / product Vite `define`):

- **`VITE_POSTHOG_PROJECT_API_KEY`** — project API key at build time (`mock` / empty skips init)
- **`VITE_POSTHOG_PROJECT_HOST`** — ingest host (defaults to `https://us.i.posthog.com`)

`identifyToPostHog` / `usePostHogFeatureFlag` need optional peers `@saflib/ory-kratos-sdk` and `vue` (already present in SAF SPAs). `init` / `html` do not — so static sites can depend on this package without pulling Kratos/Vue into their Docker images.

Server-side analytics lives in [`@saflib/vendors-posthog`](../../posthog/docs/01-overview.md).
