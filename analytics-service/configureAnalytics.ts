import { getSafReporters } from "@saflib/node";
import { createAnalyticsService } from "./createAnalyticsService.ts";
import type { AnalyticsService } from "./types.ts";
import { typedEnv } from "./env.ts";

/** Default ingest host (US cloud). */
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Set in {@link configureAnalytics}; PostHog when `POSTHOG_PROJECT_API_KEY` is
 * set and not `mock`, otherwise in-memory (also forced in-memory when
 * `NODE_ENV` is `test` via {@link createAnalyticsService}).
 */
let analyticsClient: AnalyticsService | undefined;

/** Eagerly configures the PostHog (or in-memory) client. Idempotent. */
export function configureAnalytics(): void {
  if (analyticsClient) return;

  const key = typedEnv.POSTHOG_PROJECT_API_KEY?.trim();
  const useMock = !key || key === "mock";
  const host =
    typedEnv.POSTHOG_PROJECT_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  analyticsClient = useMock
    ? createAnalyticsService({ type: "in-memory" })
    : createAnalyticsService({
        type: "posthog",
        apiKey: key,
        host,
      });

  const { log } = getSafReporters();
  log.info(`analytics: ${useMock ? "in-memory (mock)" : "PostHog"}`);
}

/**
 * Returns the shared analytics service. Lazily configures from env when not
 * already set (e.g. HTTP route tests that skip startup wiring).
 */
export function getAnalyticsClient(): AnalyticsService {
  configureAnalytics();
  return analyticsClient!;
}

/** Test-only: clear so configure can run again. */
export function resetAnalyticsForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetAnalyticsForTests is only available in test");
  }
  analyticsClient = undefined;
}
