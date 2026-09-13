import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowLogTable } from "../../schemas/workflow-log.ts";
import { and, asc, eq, gt } from "drizzle-orm";

export type ListByRunWorkflowLogParams = {
  run_id: string;
  /** Only rows created strictly after this timestamp (cursor-based paging). */
  after?: Date;
  limit?: number;
};

export const listByRunWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunWorkflowLogParams,
  ): Promise<ReturnsError<(typeof workflowLogTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowLogTable)
      .where(
        params.after
          ? and(
              eq(workflowLogTable.run_id, params.run_id),
              gt(workflowLogTable.created_at, params.after),
            )
          : eq(workflowLogTable.run_id, params.run_id),
      )
      .orderBy(asc(workflowLogTable.created_at))
      .limit(params.limit ?? 500);

    return { result: rows };
  },
);
