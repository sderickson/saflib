import { posthog, type PostHogConfig } from "posthog-js";

/**
 * Overrides for {@link posthog.init}. Merged on top of {@link DEFAULT_INIT_OPTIONS}.
 */
export type InitPostHogOptions = Partial<PostHogConfig>;

/**
 * Conservative defaults: cookieless (no cookie banner) and no session replay.
 *
 * Requires "Cookieless server hash mode" enabled in PostHog project settings,
 * otherwise cookieless events are dropped at ingest.
 */
export const DEFAULT_INIT_OPTIONS = {
  capture_pageview: false,
  cookieless_mode: "always",
  disable_session_recording: true,
  person_profiles: "never",
} as const satisfies Partial<PostHogConfig>;

/**
 * Optional PostHog init when `VITE_POSTHOG_PROJECT_API_KEY` is set at build time.
 *
 * Product events reach PostHog through {@link @saflib/vue}'s
 * {@link commonEventLogger}, which calls `globalThis.posthog.capture` when the
 * client is loaded. Call this once from your SPA `main.ts` (or use
 * {@link makePosthogScriptTag} in Vite HTML instead).
 *
 * @param options - Merged over {@link DEFAULT_INIT_OPTIONS} (later keys win).
 */
export function initPostHogIfConfigured(
  options: InitPostHogOptions = {},
): void {
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
    ...DEFAULT_INIT_OPTIONS,
    ...options,
  });
  console.log("PostHog initialized");
}
