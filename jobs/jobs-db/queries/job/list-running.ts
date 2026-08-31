import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { eq } from "drizzle-orm";

export type RunningJobRow = Pick<
  typeof jobTable.$inferSelect,
  "id" | "operation_id" | "attempt" | "max_attempts" | "heartbeat_at"
>;

export type ListRunningJobsError = never;

/**
 * Returns all jobs currently in `running` status (for stall detection).
 */
export const listRunningJobsJob = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<RunningJobRow[], ListRunningJobsError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const rows = await db
      .select({
        id: jobTable.id,
        operation_id: jobTable.operation_id,
        attempt: jobTable.attempt,
        max_attempts: jobTable.max_attempts,
        heartbeat_at: jobTable.heartbeat_at,
      })
      .from(jobTable)
      .where(eq(jobTable.status, "running"));

    return { result: rows };
  },
);
