import { getSafContext, getSafReporters } from "@saflib/node";
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
  protected getCapturePropertiesFromSafContext(
    ctx: SafContext,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const str = (v: unknown): string | undefined =>
      v != null && String(v).trim() !== "" ? String(v).trim() : undefined;
    const put = (key: string, v: unknown) => {
      const s = str(v);
      if (s !== undefined) out[key] = s;
    };
    put("host", ctx.host);
    put("origin", ctx.origin);
    put("user_agent", ctx.userAgent);
    put("accept_language", ctx.acceptLanguage);
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
    const fromEnvelope: Record<string, unknown> = {};
    const putEnvelope = (key: string, value: string | undefined) => {
      const trimmed = value?.trim();
      if (trimmed) fromEnvelope[key] = trimmed;
    };
    putEnvelope("org", event.org);
    putEnvelope("client", event.client);
    putEnvelope("view", event.view);
    putEnvelope("component", event.component);
    const mergedContext =
      event.context === undefined &&
      Object.keys(fromContext).length === 0 &&
      Object.keys(fromEnvelope).length === 0
        ? undefined
        : { ...fromContext, ...fromEnvelope, ...event.context };

    this.emitCapture({
      distinctId,
      event: event.event,
      context: mergedContext,
    });

    const { log } = getSafReporters();
    log.info(`Product event: ${event.event}`, {
      event: event.event,
      distinct_id: distinctId,
      ...(mergedContext !== undefined ? { context: mergedContext } : {}),
    });
  }

  protected abstract emitCapture(event: {
    distinctId: string;
    event: string;
    context?: Record<string, unknown>;
  }): void;
}
