import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  notExists,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const claimableStatuses = ["pending", "retrying"] as const;

const runningJob = alias(jobTable, "running_job");

export type ClaimNextJobParams = {
  /** Claim cutoff; eligible jobs must have `runAt <= now`. */
  now: Date;
};

export type ClaimNextJobError = never;

/**
 * Atomically claim the highest-priority eligible job.
 *
 * Eligibility: `pending`/`retrying`, `runAt <= now`, and no other `running`
 * job sharing a non-null `concurrencyKey`. Sets `running`, `startedAt`,
 * `heartbeatAt`, increments `attempt`. Returns the claimed row, or `null`.
 */
export const claimNextJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: ClaimNextJobParams,
  ): Promise<
    ReturnsError<typeof jobTable.$inferSelect | null, ClaimNextJobError>
  > => {
    const db = jobsDbManager.get(dbKey)!;
    const { now } = params;

    return db.transaction((tx) => {
      const candidate = tx
        .select()
        .from(jobTable)
        .where(
          and(
            inArray(jobTable.status, claimableStatuses),
            lte(jobTable.runAt, now),
            or(
              isNull(jobTable.concurrencyKey),
              notExists(
                tx
                  .select({ id: runningJob.id })
                  .from(runningJob)
                  .where(
                    and(
                      eq(runningJob.status, "running"),
                      eq(runningJob.concurrencyKey, jobTable.concurrencyKey),
                    ),
                  ),
              ),
            ),
          ),
        )
        .orderBy(
          desc(jobTable.priority),
          asc(jobTable.runAt),
          asc(jobTable.id),
        )
        .limit(1)
        .all()[0];

      if (!candidate) {
        return { result: null };
      }

      const claimed = tx
        .update(jobTable)
        .set({
          status: "running",
          startedAt: now,
          heartbeatAt: now,
          attempt: candidate.attempt + 1,
          updatedAt: now,
        })
        .where(eq(jobTable.id, candidate.id))
        .returning()
        .all()[0]!;

      return { result: claimed };
    });
  },
);
