import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createZstdCompress } from "node:zlib";
import Database from "better-sqlite3";
import type { DbKey } from "@saflib/drizzle";
import type { ObjectStore } from "@saflib/object-store";
import {
  claimBackup,
  finishBackup,
  getLatestPassedBackup,
  listBackups,
  listBackupsStartedBefore,
  markBackupsDeleted,
  recordBackupVerification,
  type OpsBackup,
  type OpsBackupTag,
} from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { compareStats, inspectSqlite, type TableStats } from "./inspect.ts";

/** A SQLite database to back up. */
export interface BackupDatabase {
  /** Short, stable name, e.g. `main`, `kratos`, `audit`. */
  name: string;
  /** The live SQLite file (or a function, for paths known only at runtime; null skips it). */
  path: string | (() => string | null);
}

export interface OpsBackupsConfig {
  databases: BackupDatabase[];
  /** The backups bucket (a store of its own, not the product's blobs). */
  store: ObjectStore;
  /**
   * How long backups are kept. Keep this well under any limit the product's
   * terms set on holding deleted data. Default 14 days.
   */
  retentionDays?: number;
  /** UTC hour after which the daily backup runs. Default 3. */
  dailyHourUtc?: number;
  /** A table shrinking by more than this since the last good backup makes it suspicious. Default 0.1. */
  shrinkThreshold?: number;
}

export interface BackupContext {
  dbKey: DbKey;
  config: OpsBackupsConfig;
  now?: () => Date;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const resolvePath = (db: BackupDatabase) => (typeof db.path === "function" ? db.path() : db.path);

/**
 * Back up one database: claim (once per `claimKey`), VACUUM INTO a temp
 * file, check it, compare with the last good backup, compress, hash, upload
 * and record. Returns undefined when another process already claimed it.
 */
export async function runBackup(
  ctx: BackupContext,
  database: BackupDatabase,
  tag: OpsBackupTag,
  claimKey: string,
): Promise<OpsBackup | undefined> {
  const now = ctx.now?.() ?? new Date();
  const claimed = await throwError(claimBackup(ctx.dbKey, { database: database.name, tag, claimKey, now }));
  if (!claimed) return undefined;

  const dir = mkdtempSync(join(tmpdir(), "saf-backup-"));
  try {
    const source = resolvePath(database);
    if (!source) throw new Error("No database file to back up");
    const copy = join(dir, `${database.name}.sqlite`);
    // A consistent, compacted copy while the app keeps writing; read-only
    // connection, so no write lock on the live database.
    const live = new Database(source, { readonly: true, fileMustExist: true });
    try {
      live.prepare("VACUUM INTO ?").run(copy);
    } finally {
      live.close();
    }

    const inspection = inspectSqlite(copy);
    const problems: string[] = [];
    if (inspection.integrity !== "ok") problems.push(`integrity_check: ${inspection.integrity}`);
    const previous = await throwError(getLatestPassedBackup(ctx.dbKey, database.name));
    const prevTables = previous?.stats ? (JSON.parse(previous.stats) as { tables?: Record<string, TableStats> }).tables : undefined;
    problems.push(...compareStats(prevTables, inspection.tables, ctx.config.shrinkThreshold));

    const compressed = `${copy}.zst`;
    const hash = createHash("sha256");
    await pipeline(
      createReadStream(copy),
      createZstdCompress(),
      new Transform({
        transform(chunk, _enc, cb) {
          hash.update(chunk);
          cb(null, chunk);
        },
      }),
      createWriteStream(compressed),
    );
    const sha256 = hash.digest("hex");
    const objectKey = `backups/${database.name}/${day(now)}/${now.toISOString().replace(/[:.]/g, "-")}-${tag}.sqlite.zst`;
    const upload = await ctx.config.store.uploadFile(objectKey, createReadStream(compressed), {
      database: database.name,
      tag,
      sha256,
    });
    if (upload.error) throw upload.error;

    return await throwError(
      finishBackup(ctx.dbKey, claimed.id, {
        status: problems.length ? "suspicious" : "ok",
        sizeBytes: statSync(compressed).size,
        rawBytes: statSync(copy).size,
        sha256,
        objectKey,
        migration: inspection.migration,
        stats: { tables: inspection.tables },
        problems,
      }),
    );
  } catch (e) {
    return await throwError(
      finishBackup(ctx.dbKey, claimed.id, { status: "failed", error: e instanceof Error ? e.message : String(e) }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Today's daily backup of each database, once the daily hour has passed. */
export async function runDueBackups(ctx: BackupContext): Promise<OpsBackup[]> {
  const now = ctx.now?.() ?? new Date();
  if (now.getUTCHours() < (ctx.config.dailyHourUtc ?? 3)) return [];
  const done: OpsBackup[] = [];
  for (const db of ctx.config.databases) {
    const b = await runBackup(ctx, db, "daily", `daily:${db.name}:${day(now)}`);
    if (b) done.push(b);
  }
  return done;
}

/** One backup of each database for this deploy (once per build). */
export async function runDeployBackups(ctx: BackupContext, buildRef: string): Promise<OpsBackup[]> {
  const done: OpsBackup[] = [];
  for (const db of ctx.config.databases) {
    const b = await runBackup(ctx, db, "deploy", `deploy:${db.name}:${buildRef}`);
    if (b) done.push(b);
  }
  return done;
}

/** "Back up now": one backup of each database. */
export async function runManualBackups(ctx: BackupContext): Promise<OpsBackup[]> {
  const done: OpsBackup[] = [];
  for (const db of ctx.config.databases) {
    const b = await runBackup(ctx, db, "manual", `manual:${db.name}:${randomUUID()}`);
    if (b) done.push(b);
  }
  return done;
}

/**
 * Delete backups older than the retention window, except each database's
 * most recent passed backup (so failures can't push out the last good one;
 * it ages out once a newer one passes).
 */
export async function applyBackupRetention(ctx: BackupContext): Promise<number> {
  const now = ctx.now?.() ?? new Date();
  const cutoff = new Date(now.getTime() - (ctx.config.retentionDays ?? 14) * 86_400_000);
  const candidates = await throwError(listBackupsStartedBefore(ctx.dbKey, cutoff));
  const keep = new Set<string>();
  for (const db of ctx.config.databases) {
    const latest = await throwError(getLatestPassedBackup(ctx.dbKey, db.name));
    if (latest) keep.add(latest.id);
  }
  const removed: string[] = [];
  for (const b of candidates) {
    if (keep.has(b.id) || b.status === "running") continue;
    if (b.object_key) {
      const r = await ctx.config.store.deleteFile(b.object_key);
      // Already gone is fine; anything else, try again next time.
      if (r.error && !/not.?found/i.test(r.error.message)) continue;
    }
    removed.push(b.id);
  }
  await throwError(markBackupsDeleted(ctx.dbKey, removed, now));
  return removed.length;
}

/**
 * Read back each database's latest passed backup when it hasn't been checked
 * in `everyDays`: download it from the store and compare its hash.
 */
export async function verifyLatestBackups(ctx: BackupContext, everyDays = 7): Promise<{ id: string; ok: boolean }[]> {
  const now = ctx.now?.() ?? new Date();
  const results: { id: string; ok: boolean }[] = [];
  for (const db of ctx.config.databases) {
    const latest = await throwError(getLatestPassedBackup(ctx.dbKey, db.name));
    if (!latest?.object_key || !latest.sha256) continue;
    if (latest.verified_at && now.getTime() - latest.verified_at.getTime() < everyDays * 86_400_000) continue;
    let ok = false;
    const read = await ctx.config.store.readFile(latest.object_key);
    if (!read.error) {
      const hash = createHash("sha256");
      for await (const chunk of read.result) hash.update(chunk as Buffer);
      ok = hash.digest("hex") === latest.sha256;
    }
    await throwError(recordBackupVerification(ctx.dbKey, latest.id, ok, now));
    results.push({ id: latest.id, ok });
  }
  return results;
}

/** Backups (kept) started in the last `days`, newest first. */
export async function recentBackups(ctx: BackupContext, days = 62): Promise<OpsBackup[]> {
  const now = ctx.now?.() ?? new Date();
  return throwError(listBackups(ctx.dbKey, { since: new Date(now.getTime() - days * 86_400_000) }));
}
