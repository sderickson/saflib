import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { eq } from "drizzle-orm";

export type RunningJobRow = Pick<
  typeof jobTable.$inferSelect,
  "id" | "operationId" | "attempt" | "maxAttempts" | "heartbeatAt"
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
        operationId: jobTable.operationId,
        attempt: jobTable.attempt,
        maxAttempts: jobTable.maxAttempts,
        heartbeatAt: jobTable.heartbeatAt,
      })
      .from(jobTable)
      .where(eq(jobTable.status, "running"));

    return { result: rows };
  },
);
