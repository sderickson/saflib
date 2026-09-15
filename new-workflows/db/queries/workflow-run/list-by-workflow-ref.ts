import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowRunTable } from "../../schemas/workflow-run.ts";
import { eq, desc, sql } from "drizzle-orm";

export type ListByWorkflowRefWorkflowRunParams = {
  workflow_ref: (typeof workflowRunTable.$inferSelect)["workflow_ref"];
};

export const listByWorkflowRefWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByWorkflowRefWorkflowRunParams,
  ): Promise<ReturnsError<(typeof workflowRunTable.$inferSelect)[]>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    // `created_at` is second-resolution, so two runs created within the
    // same second sort arbitrarily on that column alone; break ties with
    // sqlite's implicit rowid, which reflects true insertion order.
    const rows = await db
      .select()
      .from(workflowRunTable)
      .where(eq(workflowRunTable.workflow_ref, params.workflow_ref))
      .orderBy(desc(workflowRunTable.created_at), desc(sql`rowid`));

    return { result: rows };
  },
);
