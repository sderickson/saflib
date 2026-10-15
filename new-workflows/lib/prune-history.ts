import type { DbKey } from "@saflib/new-workflows-db";
import {
  pruneHistoryWorkflowRun,
  vacuumIfMostlyFreeWorkflowDb,
  type PruneHistoryWorkflowRunResult,
} from "@saflib/new-workflows-db";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_RAW_OUTPUT_RETENTION_DAYS = 7;
export const DEFAULT_LOG_RETENTION_DAYS = 30;
/** Vacuum only once at least this much of the file is free pages. */
const VACUUM_MIN_FREE_FRACTION = 0.25;

export interface PruneWorkflowHistoryOptions {
  rawOutputDays?: number;
  logDays?: number;
  now?: Date;
}

export interface PruneWorkflowHistoryResult extends PruneHistoryWorkflowRunResult {
  vacuumed: boolean;
}

/**
 * Deletes raw agent output and logs of finished runs once they're old
 * (see `pruneHistoryWorkflowRun` for what's kept), then shrinks the file
 * if that freed enough of it. Safe to call any time, and repeatedly.
 */
export async function pruneWorkflowHistory(
  dbKey: DbKey,
  options: PruneWorkflowHistoryOptions = {},
): Promise<PruneWorkflowHistoryResult> {
  const now = options.now ?? new Date();
  const rawOutputDays = options.rawOutputDays ?? DEFAULT_RAW_OUTPUT_RETENTION_DAYS;
  const logDays = options.logDays ?? DEFAULT_LOG_RETENTION_DAYS;
  const { result, error } = await pruneHistoryWorkflowRun(dbKey, {
    rawBefore: new Date(now.getTime() - rawOutputDays * DAY_MS),
    logsBefore: new Date(now.getTime() - logDays * DAY_MS),
    now,
  });
  if (error) throw error;
  let vacuumed = false;
  if (result.rawRowsDeleted > 0 || result.logRowsDeleted > 0) {
    const vacuum = await vacuumIfMostlyFreeWorkflowDb(dbKey, {
      minFreeFraction: VACUUM_MIN_FREE_FRACTION,
    });
    vacuumed = vacuum.result?.vacuumed ?? false;
  }
  return { ...result, vacuumed };
}
