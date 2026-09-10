import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as recordProductEventOperationJsonSpec } from "@saflib/analytics-spec/operations/recordProductEvent";
import { operationJsonSpec as listProductEventsOperationJsonSpec } from "@saflib/analytics-spec/operations/listProductEvents";
import { createRecordProductEventHandler } from "./record-product-event.ts";
import { createListProductEventsHandler } from "./list-product-events.ts";

/**
 * Development-only in-memory product event buffer:
 * - `POST /product-events/record` — browser event capture into the ring buffer
 * - `GET /admin/product-events` — ring buffer listing for the admin SPA
 */
export function createDevAnalyticsRouter(): Router {
  const router = Router();

  router.post(
    "/product-events/record",
    ...createOperationScopedMiddleware(recordProductEventOperationJsonSpec),
    createRecordProductEventHandler(),
  );

  router.get(
    "/admin/product-events",
    ...createOperationScopedMiddleware(listProductEventsOperationJsonSpec, {
      enforceAuth: false,
    }),
    createListProductEventsHandler(),
  );

  return router;
}
