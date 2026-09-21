import { posthog, type PostHogConfig } from "posthog-js";

/**
 * Overrides for {@link posthog.init}, plus optional explicit credentials.
 *
 * Prefer passing `apiKey` / `apiHost` from app source (`import.meta.env.VITE_*`
 * there). Vite only substitutes env in the app graph — values read inside this
 * package are often empty in production builds.
 */
export type InitPostHogOptions = Partial<PostHogConfig> & {
  apiKey?: string;
  apiHost?: string;
};

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
 * Optional PostHog init when an API key is available.
 *
 * Product events reach PostHog through `@saflib/vue`'s common event logger, which
 * calls `globalThis.posthog.capture` when the client is loaded. Call this once
 * from your SPA `main.ts`. Prefer this over {@link makePosthogScriptTag} so CSP
 * can omit `script-src 'unsafe-inline'`.
 *
 * @param options - Merged over {@link DEFAULT_INIT_OPTIONS} (later keys win).
 *   Pass `apiKey` from the app entry so Vite inlines `VITE_POSTHOG_*`.
 */
export function initPostHogIfConfigured(
  options: InitPostHogOptions = {},
): void {
  const {
    apiKey: apiKeyOption,
    apiHost: apiHostOption,
    ...posthogOptions
  } = options;

  const apiKey =
    apiKeyOption || import.meta.env.VITE_POSTHOG_PROJECT_API_KEY || "";
  const apiHost =
    apiHostOption ||
    import.meta.env.VITE_POSTHOG_PROJECT_HOST ||
    "https://us.i.posthog.com";

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
    ...DEFAULT_INIT_OPTIONS,
    ...posthogOptions,
  });
}
