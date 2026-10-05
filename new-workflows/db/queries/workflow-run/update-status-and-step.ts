import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowRunNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import {
  workflowRunTable,
  type WorkflowRunStatus,
} from "../../schemas/workflow-run.ts";
import { eq } from "drizzle-orm";

export type UpdateStatusAndStepWorkflowRunParams = {
  id: (typeof workflowRunTable.$inferSelect)["id"];
  status: WorkflowRunStatus;
  current_step_index: number;
  /** Set only on the transition to `done` — see the column's own doc comment. */
  completion_hash?: string | null;
  now: Date;
};

export type UpdateStatusAndStepWorkflowRunError = WorkflowRunNotFoundError;

/** Advances (or terminates) a run after a single `advanceRun` step attempt. */
export const updateStatusAndStepWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateStatusAndStepWorkflowRunParams,
  ): Promise<
    ReturnsError<
      typeof workflowRunTable.$inferSelect,
      UpdateStatusAndStepWorkflowRunError
    >
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const updated = await db
      .update(workflowRunTable)
      .set({
        status: params.status,
        current_step_index: params.current_step_index,
        ...(params.completion_hash !== undefined
          ? { completion_hash: params.completion_hash }
          : {}),
        updated_at: params.now,
      })
      .where(eq(workflowRunTable.id, params.id))
      .returning();

    if (!updated[0]) {
      return { error: new WorkflowRunNotFoundError() };
    }

    return { result: updated[0] };
  },
);
