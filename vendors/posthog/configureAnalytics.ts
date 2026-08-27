import {
  hasAnalyticsClient,
  getAnalyticsClient,
  resetAnalyticsForTests,
  setAnalyticsClient,
  createAnalyticsService,
} from "@saflib/analytics-service";
import { getSafReporters } from "@saflib/node";
import { PosthogAnalyticsService } from "./PosthogAnalyticsService.ts";
import { typedEnv } from "./env.ts";

/** Default ingest host (US cloud). */
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Initializes the process-level analytics client from PostHog env
 * (`POSTHOG_PROJECT_API_KEY`, `POSTHOG_PROJECT_HOST`).
 * Uses in-memory when the key is missing/`mock`, or when `NODE_ENV` is `test`.
 * Idempotent — subsequent calls are no-ops.
 */
export function configureAnalytics(): void {
  if (hasAnalyticsClient()) return;

  const key = typedEnv.POSTHOG_PROJECT_API_KEY?.trim();
  const useMock =
    process.env.NODE_ENV === "test" || !key || key === "mock";
  const host =
    typedEnv.POSTHOG_PROJECT_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  setAnalyticsClient(
    useMock
      ? createAnalyticsService({ type: "in-memory" })
      : new PosthogAnalyticsService({ apiKey: key!, host }),
  );

  const { log } = getSafReporters();
  log.info(`analytics: ${useMock ? "in-memory (mock)" : "PostHog"}`);
}

export { getAnalyticsClient, resetAnalyticsForTests };
