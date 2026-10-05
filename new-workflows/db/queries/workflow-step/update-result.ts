import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowStepNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import {
  workflowStepTable,
  type WorkflowStepStatus,
} from "../../schemas/workflow-step.ts";
import { eq } from "drizzle-orm";

export type UpdateResultWorkflowStepParams = {
  id: (typeof workflowStepTable.$inferSelect)["id"];
  status: WorkflowStepStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  now: Date;
};

export type UpdateResultWorkflowStepError = WorkflowStepNotFoundError;

export const updateResultWorkflowStep = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateResultWorkflowStepParams,
  ): Promise<
    ReturnsError<
      typeof workflowStepTable.$inferSelect,
      UpdateResultWorkflowStepError
    >
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const updated = await db
      .update(workflowStepTable)
      .set({
        status: params.status,
        result: params.result,
        error: params.error,
        finished_at: params.now,
      })
      .where(eq(workflowStepTable.id, params.id))
      .returning();

    if (!updated[0]) {
      return { error: new WorkflowStepNotFoundError() };
    }

    return { result: updated[0] };
  },
);
