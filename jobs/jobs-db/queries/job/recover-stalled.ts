import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray, ne } from "drizzle-orm";

export type RecoverStalledJobParams = {
  /** Running job ids pre-filtered by per-operation stall thresholds. */
  ids: (typeof jobTable.$inferSelect)["id"][];
  /** Written to `updated_at` / `run_at` (retry) / `finished_at` (dead). */
  now: Date;
};

export type RecoverStalledJobError = never;

/**
 * Recover stalled deliveries: running jobs in `ids` become `retrying` if
 * attempts remain, else `dead` with `terminal_reason: exhausted`.
 * Returns the affected rows.
 *
 * If another `pending`/`retrying` row already holds the same `dedupe_key`
 * (partial unique index `job_dedupe_key_queued_uidx`), mark the stalled job
 * dead instead of colliding — common after crash/restart left both a
 * running delivery and a prior retry queued.
 */
export const recoverStalledJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: RecoverStalledJobParams,
  ): Promise<
    ReturnsError<(typeof jobTable.$inferSelect)[], RecoverStalledJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;

    if (params.ids.length === 0) {
      return { result: [] };
    }

    return db.transaction((tx) => {
      const stalled = tx
        .select()
        .from(jobTable)
        .where(
          and(
            eq(jobTable.status, "running"),
            inArray(jobTable.id, params.ids),
          ),
        )
        .all();

      const affected: (typeof jobTable.$inferSelect)[] = [];

      for (const job of stalled) {
        const attemptsRemain = job.attempt < job.max_attempts;
        let markDead = !attemptsRemain;

        if (attemptsRemain && job.dedupe_key) {
          const queuedSibling = tx
            .select({ id: jobTable.id })
            .from(jobTable)
            .where(
              and(
                ne(jobTable.id, job.id),
                eq(jobTable.dedupe_key, job.dedupe_key),
                inArray(jobTable.status, ["pending", "retrying"]),
              ),
            )
            .get();
          if (queuedSibling) {
            markDead = true;
          }
        }

        const updated = tx
          .update(jobTable)
          .set(
            markDead
              ? {
                  status: "dead" as const,
                  result: { terminal_reason: "exhausted" as const },
                  finished_at: params.now,
                  updated_at: params.now,
                }
              : {
                  status: "retrying" as const,
                  run_at: params.now,
                  updated_at: params.now,
                },
          )
          .where(eq(jobTable.id, job.id))
          .returning()
          .all()[0]!;

        affected.push(updated);
      }

      return { result: affected };
    });
  },
);
