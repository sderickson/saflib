import { withAuditWriteLock } from "../../audit-write-lock.ts";
import { auditDbManager } from "../../instances.ts";
import { auditEventTable } from "../../schemas/audit-event.ts";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { count } from "drizzle-orm";

type SqliteExecClient = { exec: (sql: string) => void };

function getSqliteExec(
  db: NonNullable<ReturnType<typeof auditDbManager.get>>,
): SqliteExecClient {
  return (
    db as unknown as { session: { client: SqliteExecClient } }
  ).session.client;
}

/**
 * Empties the active audit-event table and reclaims disk space.
 *
 * **Privileged: only the audit-rotator's seal pipeline should call this**, and
 * only AFTER a sealed archive has been uploaded to GCS, renamed to `sealed/`,
 * and the digest email has succeeded.
 *
 * `BEGIN IMMEDIATE` + `DELETE` + `COMMIT`, then `VACUUM` outside the transaction.
 */
export const clearAuditEventsForRotation = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<{ deletedRows: number }, never>> => {
    const db = auditDbManager.get(dbKey);
    if (!db) {
      throw new Error("clearAuditEventsForRotation: db not connected");
    }

    return withAuditWriteLock(dbKey, () => {
      let deletedRows = 0;
      db.transaction(
        (tx) => {
          const row = tx.select({ n: count() }).from(auditEventTable).get();
          deletedRows = Number(row?.n ?? 0);
          tx.delete(auditEventTable).run();
        },
        { behavior: "immediate" },
      );

      getSqliteExec(db).exec("VACUUM");

      return { result: { deletedRows } };
    });
  },
);
