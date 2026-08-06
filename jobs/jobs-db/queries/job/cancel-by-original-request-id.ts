import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray } from "drizzle-orm";

/** Non-terminal and non-running: pending/retrying only. */
const cancellableStatuses = ["pending", "retrying"] as const;

export type CancelByOriginalRequestIdJobParams = {
  originalRequestId: (typeof jobTable.$inferSelect)["originalRequestId"];
  /** Written to `finishedAt` and `updatedAt`. */
  now: Date;
};

export type CancelByOriginalRequestIdJobError = never;

/**
 * Cancel every pending/retrying job in a chain
 * (`terminalReason: cancelled-by-chain`). Running and terminal jobs are left
 * alone. Returns the cancelled rows (possibly empty).
 */
export const cancelByOriginalRequestIdJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: CancelByOriginalRequestIdJobParams,
  ): Promise<
    ReturnsError<
      (typeof jobTable.$inferSelect)[],
      CancelByOriginalRequestIdJobError
    >
  > => {
    const db = jobsDbManager.get(dbKey)!;

    const updated = await db
      .update(jobTable)
      .set({
        status: "cancelled",
        result: { terminalReason: "cancelled-by-chain" },
        finishedAt: params.now,
        updatedAt: params.now,
      })
      .where(
        and(
          eq(jobTable.originalRequestId, params.originalRequestId),
          inArray(jobTable.status, cancellableStatuses),
        ),
      )
      .returning();

    return { result: updated };
  },
);
