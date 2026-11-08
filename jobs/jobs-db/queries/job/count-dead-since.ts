import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, count, eq, gte } from "drizzle-orm";

export type CountDeadSinceJobError = never;

/**
 * Jobs that went `dead` (exhausted retries) since `since`, by `finished_at`.
 * Old dead jobs linger until cleanup, so health checks count recent ones.
 */
export const countDeadSinceJob = queryWrapper(
  async (dbKey: DbKey, since: Date): Promise<ReturnsError<number, CountDeadSinceJobError>> => {
    const db = jobsDbManager.get(dbKey)!;
    const [row] = await db
      .select({ n: count() })
      .from(jobTable)
      .where(and(eq(jobTable.status, "dead"), gte(jobTable.finished_at, since)));
    return { result: row?.n ?? 0 };
  },
);
