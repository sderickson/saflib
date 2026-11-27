import {
  AnalyticsServiceBase,
  withoutClientIdentifiers,
} from "../AnalyticsServiceBase.ts";
import type { IdentifyProps } from "../types.ts";
import { getSafReporters } from "@saflib/node";

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

/** Calls kept (the most recent); without a vendor key this runs in production too. */
const MAX_CAPTURED_CALLS = 1000;

function keep(call: CapturedAnalyticsCall): void {
  capturedAnalyticsCalls.push(call);
  if (capturedAnalyticsCalls.length > MAX_CAPTURED_CALLS) {
    capturedAnalyticsCalls.splice(0, capturedAnalyticsCalls.length - MAX_CAPTURED_CALLS);
  }
}

export class InMemoryAnalyticsService extends AnalyticsServiceBase {
  identify(props: IdentifyProps): void {
    keep({
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
    const { log } = getSafReporters();
    log.info(`Analytics event: (${event.event})`, {
      ...event,
      ...(event.context
        ? { context: withoutClientIdentifiers(event.context) }
        : {}),
    });
    keep({
      kind: "capture",
      distinctId: event.distinctId,
      event: event.event,
      context: event.context,
    });
  }
}
