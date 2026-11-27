import { jobsDbManager } from "../../instances.ts";
import { JobNotCancellableError, JobNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray } from "drizzle-orm";

const cancellableStatuses = ["pending", "retrying"] as const;

export type CancelByIdJobParams = {
  id: (typeof jobTable.$inferSelect)["id"];
  /** Written to `finished_at` and `updated_at`. */
  now: Date;
};

export type CancelByIdJobError = JobNotFoundError | JobNotCancellableError;

/**
 * Cancel a pending/retrying job (`terminal_reason: cancelled-by-admin`), or
 * give up on a dead one (`terminal_reason: given-up-by-admin`, keeping its
 * last status code and error body): it then stops counting as failed.
 * Running, succeeded and already-cancelled jobs return `JobNotCancellableError`.
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
        result: { terminal_reason: "cancelled-by-admin" },
        finished_at: params.now,
        updated_at: params.now,
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

    const [dead] = await db
      .select()
      .from(jobTable)
      .where(and(eq(jobTable.id, params.id), eq(jobTable.status, "dead")))
      .limit(1);
    if (dead) {
      const [givenUp] = await db
        .update(jobTable)
        .set({
          status: "cancelled",
          result: { ...(dead.result ?? {}), terminal_reason: "given-up-by-admin" },
          updated_at: params.now,
        })
        .where(and(eq(jobTable.id, params.id), eq(jobTable.status, "dead")))
        .returning();
      if (givenUp) return { result: givenUp };
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
