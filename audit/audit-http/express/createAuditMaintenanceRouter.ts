import { Router } from "express";
import { makeRegisterRoute } from "@saflib/express";
import { operationJsonSpec as sealAuditLogMaintenanceOperationJsonSpec } from "@saflib/audit-spec/operations/sealAuditLogMaintenance";
import { operationJsonSpec as checkAuditLogRotationMaintenanceOperationJsonSpec } from "@saflib/audit-spec/operations/checkAuditLogRotationMaintenance";
import type { AuditSealResult } from "@saflib/audit-db/seal-types";
import type { DbKey } from "@saflib/drizzle";
import { createSealAuditLogMaintenanceHandler } from "./maintenance/seal-audit-log-maintenance.ts";
import { createCheckAuditLogRotationMaintenanceHandler } from "./maintenance/check-audit-log-rotation.ts";

export type CreateAuditMaintenanceRouterOptions = {
  getAuditDbKey: () => DbKey;
  sealAuditLogMaintenance: () => Promise<AuditSealResult>;
};

/** Background audit seal and rotation watchdog routes under `/maintenance/*`. */
const registerRoute = makeRegisterRoute({});

export function createAuditMaintenanceRouter(
  options: CreateAuditMaintenanceRouterOptions,
): Router {
  const router = Router();

  registerRoute(
    router,
    sealAuditLogMaintenanceOperationJsonSpec,
    createSealAuditLogMaintenanceHandler({
      sealAuditLogMaintenance: options.sealAuditLogMaintenance,
    }),
  );
  registerRoute(
    router,
    checkAuditLogRotationMaintenanceOperationJsonSpec,
    createCheckAuditLogRotationMaintenanceHandler({
      getAuditDbKey: options.getAuditDbKey,
    }),
  );

  return router;
}
