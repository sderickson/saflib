import { jobsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { jobTable } from "../../schemas/job.ts";
import { and, inArray, lt } from "drizzle-orm";

const terminalStatuses = ["succeeded", "dead", "cancelled"] as const;

export type DeleteExpiredTerminalJobParams = {
  /** Delete terminal jobs with `finished_at` strictly before this. */
  cutoff: Date;
};

export type DeleteExpiredTerminalJobError = never;

/**
 * Retention sweep: delete terminal jobs older than `cutoff`. Returns the
 * number of rows deleted.
 */
export const deleteExpiredTerminalJob = queryWrapper(
  async (
    dbKey: DbKey,
    params: DeleteExpiredTerminalJobParams,
  ): Promise<ReturnsError<number, DeleteExpiredTerminalJobError>> => {
    const db = jobsDbManager.get(dbKey)!;

    const deleted = await db
      .delete(jobTable)
      .where(
        and(
          inArray(jobTable.status, terminalStatuses),
          lt(jobTable.finished_at, params.cutoff),
        ),
      )
      .returning({ id: jobTable.id });

    return { result: deleted.length };
  },
);
