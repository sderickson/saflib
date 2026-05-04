import { AnalyticsServiceBase } from "../AnalyticsServiceBase.ts";
import type { IdentifyProps } from "../types.ts";

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

export class InMemoryAnalyticsService extends AnalyticsServiceBase {
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

  protected emitCapture(event: {
    distinctId: string;
    event: string;
    context?: Record<string, unknown>;
  }): void {
    capturedAnalyticsCalls.push({
      kind: "capture",
      distinctId: event.distinctId,
      event: event.event,
      context: event.context,
    });
  }
}
