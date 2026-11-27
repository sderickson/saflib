import { getSafReporters } from "@saflib/node";
import { failStaleBackups } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import {
  applyBackupRetention,
  runDeployBackups,
  runDueBackups,
  verifyLatestBackups,
  type BackupContext,
} from "./runner.ts";
import { uploadPreMigrationSnapshots } from "./pre-migration.ts";

/**
 * Start the backup schedule in this process: a deploy backup soon after a
 * new build starts, then every 15 minutes the daily backup (once a day,
 * after the daily hour), retention and the weekly read-back. Blue and green
 * both run it; claims in the ops DB make each backup happen once.
 */
export function startBackups(
  ctx: BackupContext,
  options: { buildRef?: Promise<string | null>; initialDelayMs?: number; intervalMs?: number } = {},
): () => void {
  const report = (e: unknown) => {
    try {
      getSafReporters().logError(e instanceof Error ? e : new Error(String(e)));
    } catch {
      // Outside a SAF context; nothing else to do.
    }
  };
  let running = false;
  const tick = async (first: boolean) => {
    if (running) return;
    running = true;
    try {
      // Anything still "running" after two hours belonged to a process that died.
      await throwError(failStaleBackups(ctx.dbKey, new Date((ctx.now?.() ?? new Date()).getTime() - 2 * 3_600_000)));
      if (ctx.config.preMigrationDir) await uploadPreMigrationSnapshots(ctx, ctx.config.preMigrationDir);
      if (first) {
        const ref = await options.buildRef;
        if (ref) await runDeployBackups(ctx, ref);
      }
      await runDueBackups(ctx);
      await applyBackupRetention(ctx);
      await verifyLatestBackups(ctx);
    } catch (e) {
      report(e);
    } finally {
      running = false;
    }
  };
  let interval: NodeJS.Timeout | undefined;
  const first = setTimeout(() => {
    void tick(true);
    interval = setInterval(() => void tick(false), options.intervalMs ?? 15 * 60_000);
    interval.unref();
  }, options.initialDelayMs ?? 3 * 60_000);
  first.unref();
  return () => {
    clearTimeout(first);
    if (interval) clearInterval(interval);
  };
}
