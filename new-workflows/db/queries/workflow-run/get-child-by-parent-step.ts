import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowRunTable } from "../../schemas/workflow-run.ts";
import { and, eq } from "drizzle-orm";

export type GetChildByParentStepWorkflowRunParams = {
  parent_run_id: string;
  parent_step_index: number;
};

/**
 * `call-workflow` steps use this to find a child run they already created
 * on a prior attempt, so resuming doesn't spawn a second one. "No child
 * yet" is a normal, expected case here — not an error — so this returns a
 * plain nullable result rather than `ReturnsError`.
 */
export const getChildByParentStepWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: GetChildByParentStepWorkflowRunParams,
  ): Promise<ReturnsError<typeof workflowRunTable.$inferSelect | null, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowRunTable)
      .where(
        and(
          eq(workflowRunTable.parent_run_id, params.parent_run_id),
          eq(workflowRunTable.parent_step_index, params.parent_step_index),
        ),
      )
      .limit(1);

    return { result: rows[0] ?? null };
  },
);
