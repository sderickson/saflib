import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowAgentTurnTable } from "../../schemas/workflow-agent-turn.ts";
import { and, asc, eq, gte } from "drizzle-orm";

export type ListByRunStepWorkflowAgentTurnParams = {
  run_id: string;
  step_index: number;
  /** Only turns started at or after this — i.e. one attempt of a retried step. */
  since?: Date;
};

/** Agent turns one step made, oldest first. */
export const listByRunStepWorkflowAgentTurn = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunStepWorkflowAgentTurnParams,
  ): Promise<ReturnsError<(typeof workflowAgentTurnTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowAgentTurnTable)
      .where(
        and(
          eq(workflowAgentTurnTable.run_id, params.run_id),
          eq(workflowAgentTurnTable.step_index, params.step_index),
          params.since ? gte(workflowAgentTurnTable.started_at, params.since) : undefined,
        ),
      )
      .orderBy(asc(workflowAgentTurnTable.started_at));

    return { result: rows };
  },
);
