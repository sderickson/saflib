import { getServiceName } from "@saflib/node";
import promBundle from "express-prom-bundle";
import { Router } from "express";
import type { Request } from "express";

/** Path label: Express route template from OpenAPI, or "unspecified" when no spec match. */
function normalizeMetricPath(req: Request): string {
  const expressRoute = req.openapi?.expressRoute;
  if (typeof expressRoute === "string" && expressRoute.length > 0) {
    return expressRoute;
  }
  return "unspecified";
}

function isDevelopment(): boolean {
  return process.env.DEPLOYMENT_NAME === "development";
}

function shouldBlockExternalMetricsAccess(req: Request): boolean {
  if (isDevelopment()) return false;
  return Boolean(req.headers["x-forwarded-host"]);
}

const promRecordingMiddleware = promBundle({
  autoregister: false,
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  customLabels: {
    service_name: "",
    operation_id: "",
  },
  includeUp: true,
  normalizePath: normalizeMetricPath,
  transformLabels: (labels, req) => {
    labels.service_name = getServiceName();
    const opId = req.openapi?.schema?.operationId;
    labels.operation_id = typeof opId === "string" ? opId : "";
    return labels;
  },
});

/** Serves `/metrics` with a forwarded-host gate outside development. */
export const metricsRouter = Router();

metricsRouter.get("/metrics", (req, res, next) => {
  if (shouldBlockExternalMetricsAccess(req)) {
    res.status(403).end();
    return;
  }
  promRecordingMiddleware.metricsMiddleware(req, res, next);
});

/** RED metrics collection plus gated `/metrics` exposition. */
export const metricsMiddleware = [metricsRouter, promRecordingMiddleware];
