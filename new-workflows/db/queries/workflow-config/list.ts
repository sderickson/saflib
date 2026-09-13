import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowConfigTable } from "../../schemas/workflow-config.ts";
import { desc } from "drizzle-orm";

export const listWorkflowConfig = queryWrapper(
  async (
    dbKey: DbKey,
  ): Promise<ReturnsError<(typeof workflowConfigTable.$inferSelect)[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowConfigTable)
      .orderBy(desc(workflowConfigTable.created_at));

    return { result: rows };
  },
);
