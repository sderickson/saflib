import { getSafContext } from "@saflib/node";
import type { SafContext } from "@saflib/node";
import type { AnalyticsService, CommonEvent, IdentifyProps } from "./types.ts";

/**
 * Shared server-side analytics behavior: merges `getSafContext()`-derived fields into every
 * `capture` payload so all integrations (PostHog, in-memory, etc.) stay consistent.
 */
export abstract class AnalyticsServiceBase implements AnalyticsService {
  abstract identify(props: IdentifyProps): void;

  abstract shutdown(): void | Promise<void>;

  /**
   * Fields merged under capture `context` / PostHog `properties` from the current SafContext.
   * Subclasses do not override this for normal HTTP use; extend only if you add more keys.
   */
  protected getCapturePropertiesFromSafContext(ctx: SafContext): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (ctx.host != null && String(ctx.host).trim() !== "") {
      out.host = ctx.host;
    }
    return out;
  }

  capture(event: CommonEvent): void {
    const ctx = getSafContext();
    const userId = ctx.auth?.userId;
    if (userId == null || String(userId).trim() === "") {
      throw new Error(
        "Analytics capture requires SafContext.auth.userId (authenticated request).",
      );
    }
    const distinctId = String(userId).trim();
    const fromContext = this.getCapturePropertiesFromSafContext(ctx);
    const mergedContext =
      event.context === undefined && Object.keys(fromContext).length === 0
        ? undefined
        : { ...fromContext, ...event.context };

    this.emitCapture({
      distinctId,
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
