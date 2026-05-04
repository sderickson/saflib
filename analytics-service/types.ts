export interface CommonEvent {
  event: string;
  context?: Record<string, unknown>;
}

/** Matches PostHog `identify` input closely enough for both integrations. */
export interface IdentifyProps {
  distinctId: string;
  properties?: Record<string, unknown>;
  disableGeoip?: boolean;
}

/**
 * Server-side analytics client. Concrete implementations should extend
 * `AnalyticsServiceBase` so each `capture` uses `getSafContext().auth.userId` as PostHog distinct id
 * and enriches payloads from SafContext (e.g. HTTP `host`).
 */
export interface AnalyticsService {
  identify: (props: IdentifyProps) => void;
  shutdown: () => void | Promise<void>;
  capture: (event: CommonEvent) => void;
}

export type TypedAnalytics<E extends CommonEvent> = Pick<
  AnalyticsService,
  "identify" | "shutdown"
> & {
  capture: (event: E) => void;
};
