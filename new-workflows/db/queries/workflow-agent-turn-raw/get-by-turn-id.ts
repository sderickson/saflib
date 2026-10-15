import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { eq } from "drizzle-orm";
import { workflowAgentTurnRawTable } from "../../schemas/workflow-agent-turn-raw.ts";

/** One turn's raw CLI output, or undefined if none was stored. */
export const getByTurnIdWorkflowAgentTurnRaw = queryWrapper(
  async (
    dbKey: DbKey,
    params: { turn_id: string },
  ): Promise<ReturnsError<typeof workflowAgentTurnRawTable.$inferSelect | undefined, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const rows = await db
      .select()
      .from(workflowAgentTurnRawTable)
      .where(eq(workflowAgentTurnRawTable.turn_id, params.turn_id))
      .limit(1);
    return { result: rows[0] };
  },
);
