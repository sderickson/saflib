import { posthog } from "posthog-js";

/**
 * Optional PostHog init when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.
 *
 * Product events reach PostHog through `@saflib/vue`'s common event logger, which
 * calls `globalThis.posthog.capture` when the client is loaded. Call this once
 * from your SPA `main.ts`. Prefer this over `makePosthogScriptTag` so CSP can
 * omit `script-src 'unsafe-inline'`.
 */
export function initPostHogIfConfigured(): void {
  const apiKey = import.meta.env.VITE_POSTHOG_PROJECT_API_KEY;
  const apiHost =
    import.meta.env.VITE_POSTHOG_PROJECT_HOST ?? "https://us.i.posthog.com";

  if (
    !apiKey ||
    apiKey === "mock" ||
    typeof globalThis.window === "undefined"
  ) {
    return;
  }

  if (
    "posthog" in globalThis &&
    // @ts-expect-error - posthog is loaded from posthog-js at runtime
    globalThis.posthog?.__loaded
  ) {
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    defaults: "2025-05-24",
    person_profiles: "always",
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
}
