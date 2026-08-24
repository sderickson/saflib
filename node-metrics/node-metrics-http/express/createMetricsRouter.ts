import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getMetricsSnapshotOperationJsonSpec } from "@saflib/node-metrics-spec/operations/getMetricsSnapshot";
import { createGetMetricsSnapshotHandler } from "./get-metrics-snapshot.ts";

/**
 * Site-admin route that returns parsed in-process Prometheus metrics.
 */
export function createMetricsRouter(): Router {
  const router = Router();

  router.get(
    "/admin/metrics/snapshot",
    ...createOperationScopedMiddleware(getMetricsSnapshotOperationJsonSpec),
    createGetMetricsSnapshotHandler(),
  );

  return router;
}
