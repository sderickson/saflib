import { getServiceName } from "@saflib/node";
import promBundle from "express-prom-bundle";
import { Router } from "express";
import type { Request } from "express";

export const metricsRouter = Router();

/** Path label: Express route template from OpenAPI, or "unspecified" when no spec match. */
function normalizeMetricPath(req: Request): string {
  const expressRoute = req.openapi?.expressRoute;
  if (typeof expressRoute === "string" && expressRoute.length > 0) {
    return expressRoute;
  }
  return "unspecified";
}

// block external access to /metrics
metricsRouter.get("/metrics", (req, res, next) => {
  if (!req.headers["x-forwarded-host"]) {
    next();
    return;
  }
  res.status(403).end();
});

export const metricsMiddleware = promBundle({
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
