import express from "express";
import { createScopedMiddleware, type SecurityResolver } from "@saflib/express";
import { jsonSpec } from "@saflib/ops-spec";
import { getOpsHealthHandler } from "./get-ops-health.ts";
import { getOpsDigestHandler } from "./get-ops-digest.ts";
import { listOpsDeploysHandler } from "./list-ops-deploys.ts";
import { listOpsLogsHandler } from "./list-ops-logs.ts";
import { listOpsLogTemplatesHandler } from "./list-ops-log-templates.ts";
import {
  getOpsIssueHandler,
  ignoreOpsIssueHandler,
  listOpsIssueOccurrencesHandler,
  listOpsIssuesHandler,
  reopenOpsIssueHandler,
  resolveOpsIssueHandler,
} from "./issues.ts";
import { listOpsTokensHandler } from "./list-ops-tokens.ts";
import { createOpsTokenHandler } from "./create-ops-token.ts";
import { revokeOpsTokenHandler } from "./revoke-ops-token.ts";
import {
  listOpsMetricsSeriesHandler,
  queryOpsMetricsHandler,
  queryOpsMetricsRangeHandler,
} from "./metrics.ts";
import {
  createOpsGraphLinkHandler,
  getOpsGraphPngHandler,
  getOpsGraphSvgHandler,
} from "./graphs.ts";
import { getOpsAccessHandler } from "./get-ops-access.ts";
import { getOpsDependenciesHandler } from "./get-ops-dependencies.ts";
import { ackOpsAlertHandler, listOpsAlertsHandler, receiveOpsAlertsHandler } from "./alerts.ts";

/** Routes with full paths (`/ops/*`, `/admin/ops-tokens*`). */
export function createOpsRoutes(opsTokenResolver: SecurityResolver) {
  const router = express.Router();
  router.use(
    ...createScopedMiddleware({
      apiSpec: jsonSpec,
      securityResolvers: { "ops-token": opsTokenResolver },
    }),
  );
  router.get("/ops/access", getOpsAccessHandler);
  router.get("/ops/health", getOpsHealthHandler);
  router.get("/ops/digest", getOpsDigestHandler);
  router.get("/ops/deploys", listOpsDeploysHandler);
  router.get("/ops/dependencies", getOpsDependenciesHandler);
  router.get("/ops/logs", listOpsLogsHandler);
  router.get("/ops/logs/templates", listOpsLogTemplatesHandler);
  router.get("/ops/metrics/query", queryOpsMetricsHandler);
  router.get("/ops/metrics/query_range", queryOpsMetricsRangeHandler);
  router.get("/ops/metrics/series", listOpsMetricsSeriesHandler);
  router.post("/ops/metrics/graph-links", createOpsGraphLinkHandler);
  router.get("/ops/metrics/graph.svg", getOpsGraphSvgHandler);
  router.get("/ops/metrics/graph.png", getOpsGraphPngHandler);
  router.get("/ops/alerts", listOpsAlertsHandler);
  router.post("/ops/alerts/webhook", receiveOpsAlertsHandler);
  router.post("/ops/alerts/:id/ack", ackOpsAlertHandler);
  router.get("/ops/issues", listOpsIssuesHandler);
  router.get("/ops/issues/:id", getOpsIssueHandler);
  router.get("/ops/issues/:id/occurrences", listOpsIssueOccurrencesHandler);
  router.post("/ops/issues/:id/resolve", resolveOpsIssueHandler);
  router.post("/ops/issues/:id/ignore", ignoreOpsIssueHandler);
  router.post("/ops/issues/:id/reopen", reopenOpsIssueHandler);
  router.get("/admin/ops-tokens", listOpsTokensHandler);
  router.post("/admin/ops-tokens", createOpsTokenHandler);
  router.post("/admin/ops-tokens/:id/revoke", revokeOpsTokenHandler);
  return router;
}
