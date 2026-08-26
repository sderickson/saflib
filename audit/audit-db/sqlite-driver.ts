import { auditDbManager } from "./instances.ts";

type SqliteDatabase = import("better-sqlite3").Database;

/** Raw better-sqlite3 handle for the audit DB connection behind `dbKey`. */
export function getAuditSqliteDriver(
  dbKey: import("@saflib/drizzle").DbKey,
): SqliteDatabase {
  const db = auditDbManager.get(dbKey);
  if (!db) {
    throw new Error("getAuditSqliteDriver: database not connected");
  }
  return (db as unknown as { session: { client: SqliteDatabase } }).session
    .client;
}
