export interface WithDistinctId {
  distinctId: string;
}

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

export interface AnalyticsService {
  identify: (props: IdentifyProps) => void;
  shutdown: () => void | Promise<void>;
  capture: (event: CommonEvent & WithDistinctId) => void;
}

export type TypedAnalytics<E extends CommonEvent> = Pick<
  AnalyticsService,
  "identify" | "shutdown"
> & {
  capture: (event: E & WithDistinctId) => void;
};
