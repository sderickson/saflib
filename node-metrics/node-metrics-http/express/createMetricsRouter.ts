import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as getMetricsSnapshotOperationJsonSpec } from "@saflib/node-metrics-spec/operations/getMetricsSnapshot";
import { createGetMetricsSnapshotHandler } from "./get-metrics-snapshot.ts";

/**
 * Development-only route that returns parsed in-process Prometheus metrics
 * (Prometheus/Grafana in production).
 */
export function createMetricsRouter(): Router {
  const router = Router();

  router.get(
    "/admin/metrics/snapshot",
    ...createOperationScopedMiddleware(getMetricsSnapshotOperationJsonSpec, {
      enforceAuth: false,
    }),
    createGetMetricsSnapshotHandler(),
  );

  return router;
}
