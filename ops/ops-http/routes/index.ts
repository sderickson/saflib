import express from "express";
import { createScopedMiddleware, type SecurityResolver } from "@saflib/express";
import { jsonSpec } from "@saflib/ops-spec";
import { getOpsHealthHandler } from "./get-ops-health.ts";
import { listOpsDeploysHandler } from "./list-ops-deploys.ts";
import { listOpsLogsHandler } from "./list-ops-logs.ts";
import { listOpsLogTemplatesHandler } from "./list-ops-log-templates.ts";
import { listOpsTokensHandler } from "./list-ops-tokens.ts";
import { createOpsTokenHandler } from "./create-ops-token.ts";
import { revokeOpsTokenHandler } from "./revoke-ops-token.ts";

/** Routes with full paths (`/ops/*`, `/admin/ops-tokens*`). */
export function createOpsRoutes(opsTokenResolver: SecurityResolver) {
  const router = express.Router();
  router.use(
    ...createScopedMiddleware({
      apiSpec: jsonSpec,
      securityResolvers: { "ops-token": opsTokenResolver },
    }),
  );
  router.get("/ops/health", getOpsHealthHandler);
  router.get("/ops/deploys", listOpsDeploysHandler);
  router.get("/ops/logs", listOpsLogsHandler);
  router.get("/ops/logs/templates", listOpsLogTemplatesHandler);
  // Same query as /ops/logs, behind a site-admin session for the admin SPA.
  router.get("/admin/logs", listOpsLogsHandler);
  router.get("/admin/ops-tokens", listOpsTokensHandler);
  router.post("/admin/ops-tokens", createOpsTokenHandler);
  router.post("/admin/ops-tokens/:id/revoke", revokeOpsTokenHandler);
  return router;
}
