import { randomUUID } from "node:crypto";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { opsDbManager } from "../../instances.ts";
import { opsBackups, type OpsBackup, type OpsBackupStatus, type OpsBackupTag } from "../../schema.ts";

/**
 * Claim a backup: insert a `running` row unless `claimKey` is taken (another
 * process got there first). Returns the row, or undefined when already claimed.
 */
export const claimBackup = queryWrapper(
  async (
    dbKey: DbKey,
    params: { database: string; tag: OpsBackupTag; claimKey: string; now?: Date; sourcePath?: string | null },
  ): Promise<ReturnsError<OpsBackup | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .insert(opsBackups)
      .values({
        id: randomUUID(),
        database: params.database,
        tag: params.tag,
        claim_key: params.claimKey,
        started_at: params.now ?? new Date(),
        status: "running",
        source_path: params.sourcePath ?? null,
      })
      .onConflictDoNothing({ target: opsBackups.claim_key })
      .returning();
    return { result: rows[0] };
  },
);

/** Record how a claimed backup ended. */
export const finishBackup = queryWrapper(
  async (
    dbKey: DbKey,
    id: string,
    fields: {
      status: Exclude<OpsBackupStatus, "running">;
      finishedAt?: Date;
      sizeBytes?: number | null;
      rawBytes?: number | null;
      sha256?: string | null;
      objectKey?: string | null;
      migration?: string | null;
      stats?: unknown;
      problems?: string[] | null;
      error?: string | null;
    },
  ): Promise<ReturnsError<OpsBackup | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const [row] = await db
      .update(opsBackups)
      .set({
        status: fields.status,
        finished_at: fields.finishedAt ?? new Date(),
        size_bytes: fields.sizeBytes ?? null,
        raw_bytes: fields.rawBytes ?? null,
        sha256: fields.sha256 ?? null,
        object_key: fields.objectKey ?? null,
        migration: fields.migration ?? null,
        stats: fields.stats === undefined ? null : JSON.stringify(fields.stats),
        problems: fields.problems?.length ? JSON.stringify(fields.problems) : null,
        error: fields.error ?? null,
      })
      .where(eq(opsBackups.id, id))
      .returning();
    return { result: row };
  },
);

/** Backups started since `since` (default: all kept ones), newest first. */
export const listBackups = queryWrapper(
  async (
    dbKey: DbKey,
    params: { since?: Date; includeDeleted?: boolean; limit?: number } = {},
  ): Promise<ReturnsError<OpsBackup[], never>> => {
    const db = opsDbManager.get(dbKey)!;
    const where = and(
      params.since ? gte(opsBackups.started_at, params.since) : undefined,
      params.includeDeleted ? undefined : isNull(opsBackups.deleted_at),
    );
    const rows = await db
      .select()
      .from(opsBackups)
      .where(where)
      .orderBy(desc(opsBackups.started_at))
      .limit(params.limit ?? 1000);
    return { result: rows };
  },
);

/** The newest finished backup of `database` that passed its checks (`ok`), if any. */
export const getLatestPassedBackup = queryWrapper(
  async (dbKey: DbKey, database: string): Promise<ReturnsError<OpsBackup | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const row = await db.query.opsBackups.findFirst({
      where: and(eq(opsBackups.database, database), eq(opsBackups.status, "ok"), isNull(opsBackups.deleted_at)),
      orderBy: [desc(opsBackups.started_at)],
    });
    return { result: row };
  },
);

/** One backup by id (kept or not). */
export const getBackup = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<ReturnsError<OpsBackup | undefined, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const row = await db.query.opsBackups.findFirst({ where: eq(opsBackups.id, id) });
    return { result: row };
  },
);

/** Record a read-back of a stored backup. */
export const recordBackupVerification = queryWrapper(
  async (dbKey: DbKey, id: string, ok: boolean, at: Date = new Date()): Promise<ReturnsError<void, never>> => {
    const db = opsDbManager.get(dbKey)!;
    await db.update(opsBackups).set({ verified_at: at, verified_ok: ok }).where(eq(opsBackups.id, id));
    return { result: undefined };
  },
);

/** Kept backups started before `before` (retention candidates). */
export const listBackupsStartedBefore = queryWrapper(
  async (dbKey: DbKey, before: Date): Promise<ReturnsError<OpsBackup[], never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .select()
      .from(opsBackups)
      .where(and(lt(opsBackups.started_at, before), isNull(opsBackups.deleted_at)));
    return { result: rows };
  },
);

/** Mark backups as removed by retention (their objects deleted). */
export const markBackupsDeleted = queryWrapper(
  async (dbKey: DbKey, ids: string[], at: Date = new Date()): Promise<ReturnsError<void, never>> => {
    if (!ids.length) return { result: undefined };
    const db = opsDbManager.get(dbKey)!;
    await db.update(opsBackups).set({ deleted_at: at }).where(inArray(opsBackups.id, ids));
    return { result: undefined };
  },
);

/**
 * Backups left `running` by a process that died mid-way: marked failed so
 * they don't look in progress forever.
 */
export const failStaleBackups = queryWrapper(
  async (dbKey: DbKey, startedBefore: Date): Promise<ReturnsError<number, never>> => {
    const db = opsDbManager.get(dbKey)!;
    const rows = await db
      .update(opsBackups)
      .set({ status: "failed", finished_at: new Date(), error: "Interrupted (the process stopped mid-backup)" })
      .where(and(eq(opsBackups.status, "running"), lt(opsBackups.started_at, startedBefore)))
      .returning({ id: opsBackups.id });
    return { result: rows.length };
  },
);
