import type { AnalyticsService } from "./types.ts";
import { InMemoryAnalyticsService } from "./in-memory/InMemoryAnalyticsService.ts";

export type CreateAnalyticsServiceOptions = { type: "in-memory" };

/**
 * Creates an in-memory analytics service.
 * For PostHog, use `@saflib/vendors-posthog`.
 */
export function createAnalyticsService(
  options: CreateAnalyticsServiceOptions,
): AnalyticsService {
  switch (options.type) {
    case "in-memory":
      return new InMemoryAnalyticsService();
    default: {
      const _: never = options;
      return _;
    }
  }
}
