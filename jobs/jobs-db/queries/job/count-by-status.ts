import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable, type JobStatus } from "../../schemas/job.ts";
import { count } from "drizzle-orm";

export type JobStatusCount = {
  status: JobStatus;
  count: number;
};

export type CountByStatusJobError = never;

/**
 * Counts of jobs grouped by status (for the `jobs_queue_depth` gauge).
 * Statuses with zero jobs are omitted.
 */
export const countByStatusJob = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<JobStatusCount[], CountByStatusJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const rows = await db
      .select({
        status: jobTable.status,
        count: count(),
      })
      .from(jobTable)
      .groupBy(jobTable.status);

    return { result: rows };
  },
);
