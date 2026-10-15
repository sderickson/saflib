import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowAgentTurnTable } from "../../schemas/workflow-agent-turn.ts";
import { asc, eq } from "drizzle-orm";

export type ListBySessionRunWorkflowAgentTurnParams = {
  session_run_id: string;
};

/** Every agent turn under one root run (its own steps and all nested children), oldest first. */
export const listBySessionRunWorkflowAgentTurn = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListBySessionRunWorkflowAgentTurnParams,
  ): Promise<ReturnsError<(typeof workflowAgentTurnTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowAgentTurnTable)
      .where(eq(workflowAgentTurnTable.session_run_id, params.session_run_id))
      .orderBy(asc(workflowAgentTurnTable.started_at));

    return { result: rows };
  },
);
