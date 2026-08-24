import { auditDbManager } from "../../instances.ts";
import { auditEventTable } from "../../schemas/audit-event.ts";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { count } from "drizzle-orm";

/**
 * Deletes all rows from the active audit DB. For HTTP/route tests only — does not
 * run VACUUM (unlike {@link clearAuditEventsForRotation}).
 */
export const clearAuditEventsForTests = queryWrapper(
  async (dbKey: DbKey): Promise<ReturnsError<{ deletedRows: number }, never>> => {
    const db = auditDbManager.get(dbKey);
    if (!db) {
      throw new Error("clearAuditEventsForTests: db not connected");
    }

    let deletedRows = 0;
    db.transaction(
      (tx) => {
        const row = tx.select({ n: count() }).from(auditEventTable).get();
        deletedRows = Number(row?.n ?? 0);
        tx.delete(auditEventTable).run();
      },
      { behavior: "immediate" },
    );

    return { result: { deletedRows } };
  },
);