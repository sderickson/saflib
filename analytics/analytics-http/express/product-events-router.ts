import { Router, type Request } from "express";
import createError from "http-errors";
import { createOperationScopedMiddleware } from "@saflib/express";
import { getSafContext } from "@saflib/node";
import { operationJsonSpec } from "@saflib/analytics-spec/operations/recordProductEvent";
import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { getAnalyticsClient, type AnalyticsService } from "@saflib/analytics-service";
import {
  createFixedWindowLimiter,
  createMemoryStore,
  createSqliteStore,
  type RateLimitStore,
} from "@saflib/rate-limit";
import { createHandler } from "./handler.ts";
import { productEventsRateLimited } from "./metrics.ts";

/** Largest `context` (the event's properties) accepted, as JSON. */
export const MAX_CONTEXT_BYTES = 2048;

export interface ProductEventsRouterOptions {
  /**
   * Event names browsers may send: the product's typed event union. Others
   * get a 400. Omit to accept any well-formed name (not recommended in
   * production: anyone can post).
   */
  allowedEvents?: readonly string[];
  /**
   * SQLite file for rate-limit counts, on the shared data volume so restarts
   * and blue/green share them. Omit for per-process counts (tests, dev).
   */
  rateLimitDbPath?: string;
  /** Per-minute limits. Defaults: 300 per signed-in user, 60 per IP, 600 for all anonymous traffic. */
  limits?: { perUser?: number; perIp?: number; anonymous?: number };
  /** Defaults to the process analytics client. */
  getAnalytics?: () => AnalyticsService;
}

/**
 * `POST /product-events`: browser product events, recorded like server-side
 * ones (logs DB, Prometheus counter, the analytics vendor).
 */
export function createProductEventsRouter(options: ProductEventsRouterOptions = {}): Router {
  const allowed = options.allowedEvents ? new Set(options.allowedEvents) : undefined;
  const getAnalytics = options.getAnalytics ?? getAnalyticsClient;
  const store = (name: string): RateLimitStore =>
    options.rateLimitDbPath ? createSqliteStore({ path: options.rateLimitDbPath, name }) : createMemoryStore();
  const minute = 60_000;
  const perUser = createFixedWindowLimiter({ limit: options.limits?.perUser ?? 300, windowMs: minute, store: store("product-events:user") });
  const perIp = createFixedWindowLimiter({ limit: options.limits?.perIp ?? 60, windowMs: minute, store: store("product-events:ip") });
  const anonymous = createFixedWindowLimiter({
    limit: options.limits?.anonymous ?? 600,
    windowMs: minute,
    store: store("product-events:anonymous"),
  });

  const router = Router();
  router.post(
    "/product-events",
    ...createOperationScopedMiddleware(operationJsonSpec),
    createHandler(async (req: Request, res) => {
      const { product_event: event } = req.body as AnalyticsRequestBody["recordProductEvent"];
      if (allowed && !allowed.has(event.event)) throw createError(400, "Unknown product event");
      if (event.context && JSON.stringify(event.context).length > MAX_CONTEXT_BYTES) {
        throw createError(400, "Product event properties are too large");
      }

      const userId = getSafContext().auth?.userId?.trim() || null;
      let ok: boolean;
      if (userId) {
        ok = perUser.hit(userId);
      } else {
        // Per IP first, so one noisy client doesn't use up everyone's share.
        ok = perIp.hit(req.ip ?? "unknown") && anonymous.hit("all");
      }
      if (!ok) {
        productEventsRateLimited.inc({ who: userId ? "user" : "anonymous" });
        throw createError(429, "Too many product events");
      }

      const analytics = getAnalytics();
      if (userId) analytics.capture(event);
      else analytics.captureAnonymous(event);
      res.status(204).end();
    }),
  );
  return router;
}
