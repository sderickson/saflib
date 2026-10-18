import type { ResponseBody as checkAuditLogRotationMaintenanceResponseBody } from "@saflib/audit-spec/operations/checkAuditLogRotationMaintenance";
import { createHandler } from "@saflib/express";
import createError from "http-errors";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import type { DbKey } from "@saflib/drizzle";
import { getSafReporters } from "@saflib/node";
import { mapAuditRotationStatus } from "./helpers.ts";

const ROTATION_STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000;

export function createCheckAuditLogRotationMaintenanceHandler(options: {
  getAuditDbKey: () => DbKey;
}) {
  return createHandler(async (_req, res) => {
    const { log } = getSafReporters();
    const auditDbKey = options.getAuditDbKey();

    const { result: bounds, error } =
      await getAuditEventTimestampBounds(auditDbKey);
    if (error) {
      throw error satisfies never;
    }

    const earliest = bounds!.headAt;

    if (!earliest) {
      log.info("audit watchdog: active DB is empty, nothing to check");
      const response: checkAuditLogRotationMaintenanceResponseBody["checkAuditLogRotationMaintenance"][200] =
        mapAuditRotationStatus({
          empty: true,
          earliest_at: null,
          age_ms: null,
          threshold_ms: ROTATION_STALE_THRESHOLD_MS,
        });
      res.status(200).json(response);
      return;
    }

    const ageMs = Date.now() - earliest.getTime();
    if (ageMs > ROTATION_STALE_THRESHOLD_MS) {
      throw createError(
        500,
        `audit log rotation is stale: earliest row is ${Math.round(ageMs / 3_600_000)}h old`,
      );
    }

    log.info("audit watchdog ok", { ageMs });
    const response: checkAuditLogRotationMaintenanceResponseBody["checkAuditLogRotationMaintenance"][200] =
      mapAuditRotationStatus({
        empty: false,
        earliest_at: earliest.toISOString(),
        age_ms: ageMs,
        threshold_ms: ROTATION_STALE_THRESHOLD_MS,
      });
    res.status(200).json(response);
  });
}
