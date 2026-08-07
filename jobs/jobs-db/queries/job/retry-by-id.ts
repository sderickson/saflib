import { jobsDbManager } from "../../instances.ts";
import { JobNotFoundError, JobNotRetryableError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray } from "drizzle-orm";

const retryableStatuses = ["dead", "cancelled"] as const;

export type RetryByIdJobParams = {
  id: (typeof jobTable.$inferSelect)["id"];
  /** Written to `runAt` and `updatedAt` so the job is immediately claimable. */
  now: Date;
};

export type RetryByIdJobError = JobNotFoundError | JobNotRetryableError;

/**
 * Re-queue a dead/cancelled job as pending with a full attempt reset.
 * Other statuses return `JobNotRetryableError` (409-style).
 */
export const retryByIdJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: RetryByIdJobParams,
  ): Promise<ReturnsError<typeof jobTable.$inferSelect, RetryByIdJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const updated = await db
      .update(jobTable)
      .set({
        status: "pending",
        attempt: 0,
        result: null,
        finishedAt: null,
        startedAt: null,
        heartbeatAt: null,
        runAt: params.now,
        updatedAt: params.now,
      })
      .where(
        and(
          eq(jobTable.id, params.id),
          inArray(jobTable.status, retryableStatuses),
        ),
      )
      .returning();

    if (updated[0]) {
      return { result: updated[0] };
    }

    const existing = await db
      .select({ id: jobTable.id })
      .from(jobTable)
      .where(eq(jobTable.id, params.id))
      .limit(1);

    if (!existing[0]) {
      return { error: new JobNotFoundError() };
    }

    return { error: new JobNotRetryableError() };
  },
);
