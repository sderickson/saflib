import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowRunNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowRunTable } from "../../schemas/workflow-run.ts";
import { eq } from "drizzle-orm";

export type UpdateInputWorkflowRunParams = {
  id: (typeof workflowRunTable.$inferSelect)["id"];
  input: Record<string, unknown>;
  now: Date;
};

export type UpdateInputWorkflowRunError = WorkflowRunNotFoundError;

/**
 * Replaces a run's stored `input` — used by `runCallWorkflowStep` to
 * refresh a nested child run's input from the parent's freshly-recomputed
 * `targetInput` when retrying a failed child, instead of resuming it
 * forever with whatever input it was originally created with (see that
 * file's comment for why a frozen child input is the wrong default there).
 */
export const updateInputWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateInputWorkflowRunParams,
  ): Promise<
    ReturnsError<typeof workflowRunTable.$inferSelect, UpdateInputWorkflowRunError>
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const updated = await db
      .update(workflowRunTable)
      .set({
        input: params.input,
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
