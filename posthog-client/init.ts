import { posthog } from "posthog-js";

/**
 * Optional PostHog init when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.
 *
 * Product events reach PostHog through {@link @saflib/vue}'s
 * {@link commonEventLogger}, which calls `globalThis.posthog.capture` when the
 * client is loaded. Call this once from your SPA `main.ts` (or use
 * {@link makePosthogScriptTag} in Vite HTML instead).
 */
export function initPostHogIfConfigured(): void {
  const apiKey = import.meta.env.VITE_POSTHOG_PROJECT_API_KEY;
  const apiHost =
    import.meta.env.VITE_POSTHOG_PROJECT_HOST ?? "https://us.i.posthog.com";

  if (!apiKey || typeof globalThis.window === "undefined") {
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
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  console.log("PostHog initialized");
}
