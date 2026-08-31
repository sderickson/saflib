import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { count, eq } from "drizzle-orm";

export type CountByOriginalRequestIdJobParams = {
  original_request_id: (typeof jobTable.$inferSelect)["original_request_id"];
};

export type CountByOriginalRequestIdJobError = never;

/**
 * Count all jobs sharing an `original_request_id` (spawn-cap / lineage).
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
        .where(eq(jobTable.original_request_id, params.original_request_id))
    )[0]!;

    return { result: row.value };
  },
);
