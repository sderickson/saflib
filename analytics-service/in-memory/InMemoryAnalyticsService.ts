import type {
  AnalyticsService,
  CommonEvent,
  IdentifyProps,
  WithDistinctId,
} from "../types.ts";

export type CapturedAnalyticsCall =
  | {
      kind: "capture";
      distinctId: string;
      event: string;
      context?: Record<string, unknown>;
    }
  | {
      kind: "identify";
      distinctId: string;
      properties?: Record<string, unknown>;
      disableGeoip?: boolean;
    };

/** Shared log for all in-memory analytics instances (mirrors the email mock store pattern). */
export const capturedAnalyticsCalls: CapturedAnalyticsCall[] = [];

export function clearCapturedAnalyticsCalls(): void {
  capturedAnalyticsCalls.length = 0;
}

export class InMemoryAnalyticsService implements AnalyticsService {
  identify(props: IdentifyProps): void {
    capturedAnalyticsCalls.push({
      kind: "identify",
      distinctId: props.distinctId,
      properties: props.properties,
      disableGeoip: props.disableGeoip,
    });
  }

  shutdown(): void {
    // no-op
  }

  capture(event: CommonEvent & WithDistinctId): void {
    capturedAnalyticsCalls.push({
      kind: "capture",
      distinctId: event.distinctId,
      event: event.event,
      context: event.context,
    });
  }
}
