import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowStepTable } from "../../schemas/workflow-step.ts";
import { asc, eq } from "drizzle-orm";

export type ListByRunWorkflowStepParams = {
  run_id: string;
};

/** Ordered by `step_index` so callers can fold accumulated state (e.g. copied files). */
export const listByRunWorkflowStep = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunWorkflowStepParams,
  ): Promise<ReturnsError<(typeof workflowStepTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowStepTable)
      .where(eq(workflowStepTable.run_id, params.run_id))
      .orderBy(asc(workflowStepTable.step_index));

    return { result: rows };
  },
);
