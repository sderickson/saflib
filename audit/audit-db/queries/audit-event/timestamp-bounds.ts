import { auditDbManager } from "../../instances.ts";
import { auditEventTable } from "../../schemas/audit-event.ts";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { max, min } from "drizzle-orm";

export type AuditEventTimestampBounds = {
  /** Earliest `ts` in the table (minimum). */
  headAt: Date | null;
  /** Latest `ts` in the table (maximum). */
  tailAt: Date | null;
};

export type GetAuditEventTimestampBoundsError = never;

/** Earliest and latest `ts` in the table (nulls when empty). */
export const getAuditEventTimestampBounds = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<
    ReturnsError<AuditEventTimestampBounds, GetAuditEventTimestampBoundsError>
  > => {
    const db = auditDbManager.get(dbKey)!;
    const row = db
      .select({
        headAt: min(auditEventTable.ts),
        tailAt: max(auditEventTable.ts),
      })
      .from(auditEventTable)
      .get();

    return {
      result: {
        headAt: row?.headAt ?? null,
        tailAt: row?.tailAt ?? null,
      },
    };
  },
);
