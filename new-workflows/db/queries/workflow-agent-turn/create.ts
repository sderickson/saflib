import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowAgentTurnTable } from "../../schemas/workflow-agent-turn.ts";

export type CreateWorkflowAgentTurnParams = Omit<
  typeof workflowAgentTurnTable.$inferInsert,
  "id"
>;

/** Records one finished agent CLI invocation — see `WorkflowAgentTurnEntity`. */
export const createWorkflowAgentTurn = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateWorkflowAgentTurnParams,
  ): Promise<ReturnsError<typeof workflowAgentTurnTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const inserted = await db
      .insert(workflowAgentTurnTable)
      .values(params)
      .returning();

    return { result: inserted[0]! };
  },
);
