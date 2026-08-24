/**
 * Optional PostHog init when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.
 * Events are always recorded to the backend ring buffer via {@link eventLogger};
 * PostHog forwarding uses the global `posthog` object from {@link @saflib/vue} helpers.
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

  void import("posthog-js").then(({ default: posthog }) => {
    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: false,
      persistence: "localStorage+cookie",
    });
    console.log("PostHog initialized");
  });
}
