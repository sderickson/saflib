import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowRunNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import {
  workflowRunTable,
  type WorkflowRunAgentConfig,
} from "../../schemas/workflow-run.ts";
import { eq } from "drizzle-orm";

export type UpdateAgentConfigWorkflowRunParams = {
  id: (typeof workflowRunTable.$inferSelect)["id"];
  agent_config: WorkflowRunAgentConfig | null;
  now: Date;
};

export type UpdateAgentConfigWorkflowRunError = WorkflowRunNotFoundError;

/**
 * Replaces a run's `agent_config` — used by `runAgentTurn` to save the
 * session id an agent turn reported, so the run's next turn `--resume`s
 * it instead of starting a cold session.
 */
export const updateAgentConfigWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: UpdateAgentConfigWorkflowRunParams,
  ): Promise<
    ReturnsError<
      typeof workflowRunTable.$inferSelect,
      UpdateAgentConfigWorkflowRunError
    >
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const updated = await db
      .update(workflowRunTable)
      .set({
        agent_config: params.agent_config,
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
