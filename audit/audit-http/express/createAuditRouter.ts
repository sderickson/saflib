import { Router } from "express";
import { createOperationScopedMiddleware } from "@saflib/express";
import { operationJsonSpec as listAuditLogsOperationJsonSpec } from "@saflib/audit-spec/operations/listAuditLogs";
import type { DbKey } from "@saflib/drizzle";
import { createListAuditLogsHandler } from "./list-audit-logs.ts";

export type CreateAuditRouterOptions = {
  getAuditDbKey: () => DbKey;
};

/** Site-admin audit log browse (`GET /audit-logs`). */
export function createAuditRouter(options: CreateAuditRouterOptions): Router {
  const router = Router();

  router.get(
    "/audit-logs",
    ...createOperationScopedMiddleware(listAuditLogsOperationJsonSpec),
    createListAuditLogsHandler({ getAuditDbKey: options.getAuditDbKey }),
  );

  return router;
}
