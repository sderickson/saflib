import { jobsDbManager } from "../../instances.ts";
import { JobNotCancellableError, JobNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray } from "drizzle-orm";

const cancellableStatuses = ["pending", "retrying"] as const;

export type CancelByIdJobParams = {
  id: (typeof jobTable.$inferSelect)["id"];
  /** Written to `finishedAt` and `updatedAt`. */
  now: Date;
};

export type CancelByIdJobError = JobNotFoundError | JobNotCancellableError;

/**
 * Cancel a pending/retrying job (`terminalReason: cancelled-by-admin`).
 * Running and terminal jobs return `JobNotCancellableError`.
 */
export const cancelByIdJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: CancelByIdJobParams,
  ): Promise<ReturnsError<typeof jobTable.$inferSelect, CancelByIdJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const updated = await db
      .update(jobTable)
      .set({
        status: "cancelled",
        result: { terminalReason: "cancelled-by-admin" },
        finishedAt: params.now,
        updatedAt: params.now,
      })
      .where(
        and(
          eq(jobTable.id, params.id),
          inArray(jobTable.status, cancellableStatuses),
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

    return { error: new JobNotCancellableError() };
  },
);
