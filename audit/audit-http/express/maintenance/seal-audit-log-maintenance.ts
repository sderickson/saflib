import type { ResponseBody as sealAuditLogMaintenanceResponseBody } from "@saflib/audit-spec/operations/sealAuditLogMaintenance";
import { createHandler } from "@saflib/express";
import type { AuditSealResult } from "@saflib/audit-db/seal-types";
import { getSafReporters } from "@saflib/node";
import { mapAuditSealResult } from "./helpers.ts";

export function createSealAuditLogMaintenanceHandler(options: {
  sealAuditLogMaintenance: () => Promise<AuditSealResult>;
}) {
  return createHandler(async (_req, res) => {
    const { log } = getSafReporters();
    const result = await options.sealAuditLogMaintenance();

    if (result.status === "sealed") {
      log.info("audit seal succeeded", { archive: result.archive });
    } else if (result.reason === "empty") {
      log.info("audit seal skipped: no rows to archive");
    } else if (result.reason === "in_progress") {
      log.warn("audit seal skipped: another seal is in progress (unexpected)");
    }

    const response: sealAuditLogMaintenanceResponseBody["sealAuditLogMaintenance"][200] =
      mapAuditSealResult(result);
    res.status(200).json(response);
  });
}
