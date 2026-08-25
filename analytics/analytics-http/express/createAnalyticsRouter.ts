import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as recordProductEventOperationJsonSpec } from "@saflib/analytics-spec/operations/recordProductEvent";
import { operationJsonSpec as listProductEventsOperationJsonSpec } from "@saflib/analytics-spec/operations/listProductEvents";
import { createRecordProductEventHandler } from "./record-product-event.ts";
import { createListProductEventsHandler } from "./list-product-events.ts";

/**
 * Product analytics ingest (always mounted):
 * - `POST /product-events/record` — browser or API client event capture
 */
export function createAnalyticsRouter(): Router {
  const router = Router();

  router.post(
    "/product-events/record",
    ...createOperationScopedMiddleware(recordProductEventOperationJsonSpec),
    createRecordProductEventHandler(),
  );

  return router;
}

/**
 * Development-only in-memory product event viewer:
 * - `GET /admin/product-events` — ring buffer listing (PostHog in production)
 */
export function createDevAnalyticsRouter(): Router {
  const router = Router();

  router.get(
    "/admin/product-events",
    ...createOperationScopedMiddleware(listProductEventsOperationJsonSpec, {
      enforceAuth: false,
    }),
    createListProductEventsHandler(),
  );

  return router;
}
