import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as recordProductEventOperationJsonSpec } from "@saflib/analytics-spec/operations/recordProductEvent";
import { operationJsonSpec as listProductEventsOperationJsonSpec } from "@saflib/analytics-spec/operations/listProductEvents";
import { createRecordProductEventHandler } from "./record-product-event.ts";
import { createListProductEventsHandler } from "./list-product-events.ts";

/**
 * Product analytics routes:
 * - `POST /product-events/record` — browser or API client event capture
 * - `GET /admin/product-events` — site-admin ring buffer viewer
 */
export function createAnalyticsRouter(): Router {
  const router = Router();

  router.post(
    "/product-events/record",
    ...createOperationScopedMiddleware(recordProductEventOperationJsonSpec),
    createRecordProductEventHandler(),
  );

  router.get(
    "/admin/product-events",
    ...createOperationScopedMiddleware(listProductEventsOperationJsonSpec),
    createListProductEventsHandler(),
  );

  return router;
}
