import type { DbKey } from "@saflib/drizzle";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import { throwError } from "@saflib/utils";
import { ROTATION_STALE_THRESHOLD_MS } from "./maintenance/check-audit-log-rotation.ts";

const HOUR_MS = 3_600_000;

/** Same shape as `@saflib/ops-http`'s `DigestTileProvider`. */
export interface AuditDigestTileProvider {
  key: string;
  label: string;
  tiles: (ctx: { since: Date }) => Promise<{
    key: string;
    group: "system";
    label: string;
    value: string;
    detail: string;
    tone: "ok" | "warn" | "bad";
  }>;
}

function age(ms: number): string {
  const hours = ms / HOUR_MS;
  return hours < 48 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)} days`;
}

/**
 * Audit log tile for the admin Overview: whether the active log is being
 * sealed and shipped on time (the oldest unsealed event's age, by the same
 * rule as the rotation watchdog). Overdue needs action where sealing is
 * expected (production by default); elsewhere it's a note.
 */
export function auditDigestTile(options: {
  getAuditDbKey: () => DbKey;
  expectSealing?: boolean;
  now?: () => Date;
}): AuditDigestTileProvider {
  const expectSealing = options.expectSealing ?? process.env.DEPLOYMENT_NAME === "production";
  return {
    key: "audit",
    label: "Audit log",
    async tiles() {
      const bounds = await throwError(getAuditEventTimestampBounds(options.getAuditDbKey()));
      const oldest = bounds?.headAt;
      const base = { key: "audit", group: "system" as const, label: "Audit log" };
      if (!oldest) return { ...base, value: "Sealed", detail: "No unsealed events", tone: "ok" };
      const ageMs = (options.now?.() ?? new Date()).getTime() - oldest.getTime();
      const overdue = ageMs > ROTATION_STALE_THRESHOLD_MS;
      // Without sealing in this environment (dev, test stacks) an old
      // unsealed event is expected, not a problem.
      if (overdue && !expectSealing) {
        return { ...base, value: "Sealing off here", detail: `Oldest unsealed event ${age(ageMs)} old`, tone: "ok" };
      }
      return {
        ...base,
        value: overdue ? "Seal overdue" : "Sealed on schedule",
        detail: `Oldest unsealed event ${age(ageMs)} old`,
        tone: overdue ? "bad" : "ok",
      };
    },
  };
}
