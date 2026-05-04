import type { AnalyticsService } from "./types.ts";
import { InMemoryAnalyticsService } from "./in-memory/InMemoryAnalyticsService.ts";
import { PosthogAnalyticsService } from "./posthog/PosthogAnalyticsService.ts";

export type CreateAnalyticsServiceOptions =
  | {
      type: "posthog";
      apiKey: string;
      host: string;
    }
  | { type: "in-memory" };

/**
 * Creates an analytics service (PostHog or in-memory).
 * When `NODE_ENV` is `"test"`, always returns an in-memory implementation so tests
 * never send events to PostHog, regardless of the requested `type`.
 */
export function createAnalyticsService(
  options: CreateAnalyticsServiceOptions,
): AnalyticsService {
  if (process.env.NODE_ENV === "test") {
    return new InMemoryAnalyticsService();
  }
  switch (options.type) {
    case "posthog":
      return new PosthogAnalyticsService({
        apiKey: options.apiKey,
        host: options.host,
      });
    case "in-memory":
      return new InMemoryAnalyticsService();
    default: {
      const _: never = options;
      return _;
    }
  }
}
