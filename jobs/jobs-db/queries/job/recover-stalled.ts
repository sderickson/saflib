import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, lt } from "drizzle-orm";

export type RecoverStalledJobParams = {
  /** Running jobs with `heartbeatAt` strictly before this are stalled. */
  cutoff: Date;
  /** Written to `updatedAt` / `runAt` (retry) / `finishedAt` (dead). */
  now: Date;
};

export type RecoverStalledJobError = never;

/**
 * Recover stalled deliveries: running jobs whose heartbeat is older than
 * `cutoff` become `retrying` if attempts remain, else `dead` with
 * `terminalReason: exhausted`. Returns the affected rows.
 */
export const recoverStalledJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: RecoverStalledJobParams,
  ): Promise<
    ReturnsError<(typeof jobTable.$inferSelect)[], RecoverStalledJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;

    return db.transaction((tx) => {
      const stalled = tx
        .select()
        .from(jobTable)
        .where(
          and(
            eq(jobTable.status, "running"),
            lt(jobTable.heartbeatAt, params.cutoff),
          ),
        )
        .all();

      const affected: (typeof jobTable.$inferSelect)[] = [];

      for (const job of stalled) {
        const attemptsRemain = job.attempt < job.maxAttempts;
        const updated = tx
          .update(jobTable)
          .set(
            attemptsRemain
              ? {
                  status: "retrying" as const,
                  runAt: params.now,
                  updatedAt: params.now,
                }
              : {
                  status: "dead" as const,
                  result: { terminalReason: "exhausted" as const },
                  finishedAt: params.now,
                  updatedAt: params.now,
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
