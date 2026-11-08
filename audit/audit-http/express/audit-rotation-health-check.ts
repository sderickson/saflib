import type { DbKey } from "@saflib/drizzle";
import type { HealthCheck } from "@saflib/node";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import { ROTATION_STALE_THRESHOLD_MS } from "./maintenance/check-audit-log-rotation.ts";

const HOUR_MS = 60 * 60 * 1000;

/**
 * `audit-rotation`: the same staleness rule as the rotation watchdog (the
 * oldest row in the active audit DB should be under ~26h old), as a health
 * check. Warns past 25h so there's notice before the watchdog fails.
 */
export function createAuditRotationHealthCheck(options: {
  getAuditDbKey: () => DbKey;
}): HealthCheck {
  return {
    name: "audit-rotation",
    async run() {
      const { result: bounds, error } = await getAuditEventTimestampBounds(
        options.getAuditDbKey(),
      );
      if (error) throw error;
      const earliest = bounds?.headAt;
      if (!earliest) {
        return { status: "ok", summary: "active audit DB is empty", observed: { oldest_age_hours: null } };
      }
      const ageMs = Date.now() - earliest.getTime();
      const hours = Number((ageMs / HOUR_MS).toFixed(1));
      const status =
        ageMs > ROTATION_STALE_THRESHOLD_MS
          ? "fail"
          : ageMs > ROTATION_STALE_THRESHOLD_MS - HOUR_MS
            ? "warn"
            : "ok";
      return {
        status,
        summary:
          status === "ok"
            ? `oldest active row ${hours}h old`
            : `rotation overdue: oldest active row ${hours}h old (limit ${ROTATION_STALE_THRESHOLD_MS / HOUR_MS}h)`,
        observed: { oldest_age_hours: hours },
      };
    },
  };
}
