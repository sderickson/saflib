import { createHash } from "node:crypto";
import { createWriteStream, existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { createZstdDecompress } from "node:zlib";
import Database from "better-sqlite3";
import type { ObjectStore } from "@saflib/object-store";
import type { OpsBackup } from "@saflib/ops-db";

/**
 * Download a backup, check its hash, decompress it to `dest` and check the
 * result's integrity. Throws (and removes `dest`) if anything doesn't match.
 */
export async function downloadBackup(store: ObjectStore, backup: OpsBackup, dest: string): Promise<void> {
  if (!backup.object_key || !backup.sha256) throw new Error(`Backup ${backup.id} has no stored object`);
  const read = await store.readFile(backup.object_key);
  if (read.error) throw read.error;
  const hash = createHash("sha256");
  try {
    await pipeline(
      read.result,
      new Transform({
        transform(chunk, _enc, cb) {
          hash.update(chunk);
          cb(null, chunk);
        },
      }),
      createZstdDecompress(),
      createWriteStream(dest),
    );
    if (hash.digest("hex") !== backup.sha256) throw new Error("The stored backup doesn't match its recorded hash");
    const db = new Database(dest, { readonly: true, fileMustExist: true });
    try {
      const r = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
      if (r.integrity_check !== "ok") throw new Error(`The restored copy fails integrity_check: ${r.integrity_check}`);
    } finally {
      db.close();
    }
  } catch (e) {
    rmSync(dest, { force: true });
    throw e;
  }
}

/**
 * Put a backup back in place of the live file. Run only with the app
 * stopped (both colors): the current file is checkpointed and moved aside
 * as `<file>.replaced-<time>` (kept a week), and the verified copy takes
 * its place. Returns where the old file went.
 */
export async function restoreBackup(
  store: ObjectStore,
  backup: OpsBackup,
  options: { target?: string; now?: Date } = {},
): Promise<{ target: string; replaced: string | null }> {
  const target = options.target ?? backup.source_path;
  if (!target) throw new Error(`Backup ${backup.id} doesn't record where it came from; pass a target path`);
  const incoming = `${target}.restore-tmp`;
  await downloadBackup(store, backup, incoming);
  let replaced: string | null = null;
  if (existsSync(target)) {
    // Fold the WAL into the file so the copy we keep is complete.
    const live = new Database(target, { fileMustExist: true });
    try {
      live.pragma("wal_checkpoint(TRUNCATE)");
    } finally {
      live.close();
    }
    replaced = `${target}.replaced-${(options.now ?? new Date()).toISOString().replace(/[:.]/g, "-")}`;
    renameSync(target, replaced);
    for (const ext of ["-wal", "-shm"]) rmSync(`${target}${ext}`, { force: true });
  }
  renameSync(incoming, target);
  return { target, replaced };
}

/** Delete `*.replaced-*` files older than `days` next to the given database files. */
export function pruneReplacedFiles(paths: string[], days = 7, now: Date = new Date()): number {
  let removed = 0;
  for (const dir of new Set(paths.map((p) => dirname(p)))) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.replaced-\d{4}-\d{2}-\d{2}T/.test(name)) continue;
      if (!paths.some((p) => name.startsWith(`${basename(p)}.replaced-`))) continue;
      const file = join(dir, name);
      if (now.getTime() - statSync(file).mtimeMs > days * 86_400_000) {
        rmSync(file, { force: true });
        removed++;
      }
    }
  }
  return removed;
}
