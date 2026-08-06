import { jobsDbManager } from "../../instances.ts";
import { JobNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { eq } from "drizzle-orm";

export type GetByIdJobParams = {
  id: (typeof jobTable.$inferSelect)["id"];
};

export type GetByIdJobError = JobNotFoundError;

export const getByIdJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: GetByIdJobParams,
  ): Promise<ReturnsError<typeof jobTable.$inferSelect, GetByIdJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(jobTable)
      .where(eq(jobTable.id, params.id))
      .limit(1);

    if (!rows[0]) {
      return { error: new JobNotFoundError() };
    }

    return { result: rows[0] };
  },
);
