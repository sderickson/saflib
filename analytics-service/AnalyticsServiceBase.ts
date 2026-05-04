import { getSafContext } from "@saflib/node";
import type {
  AnalyticsService,
  CommonEvent,
  IdentifyProps,
  WithDistinctId,
} from "./types.ts";

/**
 * Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every
 * `capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent.
 */
export abstract class AnalyticsServiceBase implements AnalyticsService {
  abstract identify(props: IdentifyProps): void;

  abstract shutdown(): void | Promise<void>;

  /**
   * Fields merged under capture `context` / PostHog `properties` after SafContext lookup.
   * Subclasses do not override this for normal HTTP use; extend only if you add more keys.
   */
  protected getCapturePropertiesFromSafContext(): Record<string, unknown> {
    try {
      const ctx = getSafContext();
      const out: Record<string, unknown> = {};
      if (ctx.host != null && String(ctx.host).trim() !== "") {
        out.host = ctx.host;
      }
      return out;
    } catch {
      return {};
    }
  }

  capture(event: CommonEvent & WithDistinctId): void {
    const fromContext = this.getCapturePropertiesFromSafContext();
    const mergedContext =
      event.context === undefined && Object.keys(fromContext).length === 0
        ? undefined
        : { ...fromContext, ...event.context };

    this.emitCapture({
      distinctId: event.distinctId,
      event: event.event,
      context: mergedContext,
    });
  }

  protected abstract emitCapture(event: {
    distinctId: string;
    event: string;
    context?: Record<string, unknown>;
  }): void;
}
