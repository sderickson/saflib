import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowStepTable } from "../../schemas/workflow-step.ts";
import { and, eq, gte } from "drizzle-orm";

export type DeleteFromStepWorkflowStepParams = {
  run_id: string;
  /** Inclusive — rows at this index and later are removed. */
  from_step_index: number;
};

/**
 * Invalidates step attempts from `from_step_index` onward so a go-to seek
 * doesn't falsely resume (engine `isResume`) or keep stale later-step
 * artifacts in the `copiedFiles` merge.
 */
export const deleteFromStepWorkflowStep = queryWrapper(
  async (
    dbKey: DbKey,
    params: DeleteFromStepWorkflowStepParams,
  ): Promise<ReturnsError<(typeof workflowStepTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const deleted = await db
      .delete(workflowStepTable)
      .where(
        and(
          eq(workflowStepTable.run_id, params.run_id),
          gte(workflowStepTable.step_index, params.from_step_index),
        ),
      )
      .returning();

    return { result: deleted };
  },
);
