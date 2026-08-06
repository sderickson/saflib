import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { count, eq } from "drizzle-orm";

export type CountByOriginalRequestIdJobParams = {
  originalRequestId: (typeof jobTable.$inferSelect)["originalRequestId"];
};

export type CountByOriginalRequestIdJobError = never;

/**
 * Count all jobs sharing an `originalRequestId` (spawn-cap / lineage).
 */
export const countByOriginalRequestIdJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: CountByOriginalRequestIdJobParams,
  ): Promise<ReturnsError<number, CountByOriginalRequestIdJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const row = (
      await db
        .select({ value: count() })
        .from(jobTable)
        .where(eq(jobTable.originalRequestId, params.originalRequestId))
    )[0]!;

    return { result: row.value };
  },
);
