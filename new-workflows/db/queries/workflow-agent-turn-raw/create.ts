import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowAgentTurnRawTable } from "../../schemas/workflow-agent-turn-raw.ts";

export type CreateWorkflowAgentTurnRawParams = typeof workflowAgentTurnRawTable.$inferInsert;

/** Stores one turn's raw CLI output — see `WorkflowAgentTurnRawEntity`. */
export const createWorkflowAgentTurnRaw = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateWorkflowAgentTurnRawParams,
  ): Promise<ReturnsError<typeof workflowAgentTurnRawTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const inserted = await db.insert(workflowAgentTurnRawTable).values(params).returning();
    return { result: inserted[0]! };
  },
);
