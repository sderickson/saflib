import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { DbKey } from "@saflib/drizzle";
import lockfile from "proper-lockfile";
import { auditDb } from "./instances.ts";
import { auditDbDataRoot } from "./paths.ts";

/** Sentinel for cross-process serialization of audit DB writes (append + rotation clear). */
export function auditWriteLockPath(): string {
  return path.join(auditDbDataRoot(), ".audit-write.lock");
}

const lockOptions = {
  realpath: false,
  retries: {
    retries: 100,
    minTimeout: 10,
    maxTimeout: 200,
    factor: 1.5,
  },
} as const;

function usesOnDiskAuditDb(dbKey: DbKey): boolean {
  const storagePath = auditDb.getDbPath(dbKey);
  return storagePath !== undefined && storagePath !== ":memory:";
}

async function runLocked<T>(fn: () => T | Promise<T>): Promise<T> {
  const out = fn();
  return out instanceof Promise ? await out : out;
}

/**
 * Exclusive filesystem lock shared by every process that mutates the active audit
 * chain (appends, rotation clear). Complements SQLite `BEGIN IMMEDIATE` when
 * multiple product service processes share one on-disk audit DB.
 *
 * Skipped for in-memory SQLite (tests and single-process isolation) so appends
 * stay on the same tick as `res.on("finish")` handlers.
 */
export async function withAuditWriteLock<T>(
  dbKey: DbKey,
  fn: () => T | Promise<T>,
): Promise<T> {
  if (!usesOnDiskAuditDb(dbKey)) {
    return runLocked(fn);
  }

  const lockPath = auditWriteLockPath();
  await mkdir(path.dirname(lockPath), { recursive: true });
  const release = await lockfile.lock(lockPath, lockOptions);
  try {
    return await runLocked(fn);
  } finally {
    await release();
  }
}
