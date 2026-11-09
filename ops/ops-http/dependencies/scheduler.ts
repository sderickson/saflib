import type { DbKey } from "@saflib/drizzle";
import { getSafReporters } from "@saflib/node";
import { getLatestDependencyCheck, recordDependencyCheck } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { checkDependencies, type CheckOptions, type DependencyReport } from "./check.ts";
import type { DependencyManifest } from "./manifest.ts";

export interface DependencyCheckOptions extends CheckOptions {
  dbKey: DbKey;
  manifest: DependencyManifest;
  /** Skip a run when this lockfile was checked more recently (default 20h). */
  recheckAfterMs?: number;
}

/**
 * Check the manifest unless the same lockfile was checked recently; store the
 * report. Returns the new report, or undefined when skipped.
 */
export async function runDependencyCheckOnce(options: DependencyCheckOptions): Promise<DependencyReport | undefined> {
  const now = options.now ?? new Date();
  const latest = await throwError(getLatestDependencyCheck(options.dbKey));
  if (
    latest &&
    latest.lockfile_hash === options.manifest.lockfileHash &&
    now.getTime() - latest.checked_at.getTime() < (options.recheckAfterMs ?? 20 * 3_600_000)
  ) {
    return undefined;
  }
  const report = await checkDependencies(options.manifest, { ...options, now });
  // Without the OSV query, "no advisories" would be a false all-clear: keep
  // the previous report and surface the failure instead.
  if (report.errors.some((e) => e.startsWith("osv querybatch"))) {
    throw new Error(`dependency check failed: ${report.errors.slice(0, 3).join("; ")}`);
  }
  await throwError(recordDependencyCheck(options.dbKey, { checkedAt: now, lockfileHash: options.manifest.lockfileHash, report }));
  return report;
}

/**
 * Check a couple of minutes after startup (after a deploy settles), then
 * every 24 hours. Returns a stop function.
 */
export function startDependencyChecks(
  options: DependencyCheckOptions & { initialDelayMs?: number; intervalMs?: number },
): () => void {
  const run = () =>
    runDependencyCheckOnce(options).catch((e) => {
      try {
        getSafReporters().logError(e);
      } catch {
        // Outside a SAF context; nothing else to do.
      }
    });
  let interval: NodeJS.Timeout | undefined;
  const first = setTimeout(() => {
    void run();
    interval = setInterval(() => void run(), options.intervalMs ?? 24 * 3_600_000);
    interval.unref();
  }, options.initialDelayMs ?? 2 * 60_000);
  first.unref();
  return () => {
    clearTimeout(first);
    if (interval) clearInterval(interval);
  };
}
