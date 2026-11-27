import { getSafReporters } from "@saflib/node";
import { failStaleBackups } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { runDeployBackups, type BackupContext } from "./runner.ts";
import { uploadPreMigrationSnapshots } from "./pre-migration.ts";

/**
 * One-time backup work when this process starts (events, not a schedule;
 * the daily backups are the product's `backups` cron job): mark backups a
 * dead process left running as failed, upload snapshots taken before this
 * start's migrations, and make the deploy backup when this is the first
 * process of a new build. Blue and green both run it; claims in the ops DB
 * make each backup happen once.
 */
export function startBackups(
  ctx: BackupContext,
  options: { buildRef?: Promise<string | null>; delayMs?: number } = {},
): () => void {
  const timer = setTimeout(async () => {
    try {
      await throwError(failStaleBackups(ctx.dbKey, new Date((ctx.now?.() ?? new Date()).getTime() - 2 * 3_600_000)));
      if (ctx.config.preMigrationDir) await uploadPreMigrationSnapshots(ctx, ctx.config.preMigrationDir);
      const ref = await options.buildRef;
      if (ref) await runDeployBackups(ctx, ref);
    } catch (e) {
      try {
        getSafReporters().logError(e instanceof Error ? e : new Error(String(e)));
      } catch {
        // Outside a SAF context; nothing else to do.
      }
    }
  }, options.delayMs ?? 60_000);
  timer.unref();
  return () => clearTimeout(timer);
}
