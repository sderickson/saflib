import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, eq, inArray } from "drizzle-orm";

/** Non-terminal and non-running: pending/retrying only. */
const cancellableStatuses = ["pending", "retrying"] as const;

export type CancelByOriginalRequestIdJobParams = {
  original_request_id: (typeof jobTable.$inferSelect)["original_request_id"];
  /** Written to `finished_at` and `updated_at`. */
  now: Date;
};

export type CancelByOriginalRequestIdJobError = never;

/**
 * Cancel every pending/retrying job in a chain
 * (`terminal_reason: cancelled-by-chain`). Running and terminal jobs are left
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
        result: { terminal_reason: "cancelled-by-chain" },
        finished_at: params.now,
        updated_at: params.now,
      })
      .where(
        and(
          eq(jobTable.original_request_id, params.original_request_id),
          inArray(jobTable.status, cancellableStatuses),
        ),
      )
      .returning();

    return { result: updated };
  },
);
