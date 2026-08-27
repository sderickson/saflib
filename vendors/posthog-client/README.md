# @saflib/vendors-posthog-client

PostHog for SAF web clients: feature flags, identify, and optional SPA init.

## Product events (analytics stream)

`@saflib/vue` emits product events through `commonEventLogger`, which forwards to
any loaded `globalThis.posthog` client (alongside gtag, dataLayer, etc.). This
package does **not** own the event logger — it only loads PostHog so captures work.

1. **Load PostHog** — pick one:
   - **SPA (recommended):** in `main.ts`, `import { initPostHogIfConfigured } from "@saflib/vendors-posthog-client/init"` and call `initPostHogIfConfigured()` when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.
   - **Vite HTML plugin:** use `makePosthogScriptTag()` from `@saflib/vendors-posthog-client/html` in your build config (server-side env via `@saflib/env`).

2. **Emit events** — use your product's `clients/events.ts` (`makeProductEventLogger` → `commonEventLogger`). No PostHog-specific API at emit time.

3. **Dev backend buffer (optional)** — for local admin visibility, call
   `registerDevBackendProductEventConnector()` from `@saflib/analytics-vue/lib/registerDevBackendProductEventConnector` in `events.ts` (see `@saflib/base-clients-common`).

## Identity and feature flags

- `usePostHog()`, `usePostHogFeatureFlag()` — read flags from the global client.
- `identifyToPostHog(session)` — call after Kratos session is available (e.g. from your layout).
