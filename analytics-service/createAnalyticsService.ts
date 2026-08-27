import type { AnalyticsService } from "./types.ts";
import { InMemoryAnalyticsService } from "./in-memory/InMemoryAnalyticsService.ts";

export type CreateAnalyticsServiceOptions = { type: "in-memory" };

/**
 * Creates an in-memory analytics service.
 * For PostHog, use `@saflib/vendors-posthog`.
 */
export function createAnalyticsService(
  _options: CreateAnalyticsServiceOptions = { type: "in-memory" },
): AnalyticsService {
  return new InMemoryAnalyticsService();
}
