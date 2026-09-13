import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowRunNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowRunTable } from "../../schemas/workflow-run.ts";
import { eq } from "drizzle-orm";

export type GetByIdWorkflowRunParams = {
  id: (typeof workflowRunTable.$inferSelect)["id"];
};

export type GetByIdWorkflowRunError = WorkflowRunNotFoundError;

export const getByIdWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: GetByIdWorkflowRunParams,
  ): Promise<
    ReturnsError<typeof workflowRunTable.$inferSelect, GetByIdWorkflowRunError>
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowRunTable)
      .where(eq(workflowRunTable.id, params.id))
      .limit(1);

    if (!rows[0]) {
      return { error: new WorkflowRunNotFoundError() };
    }

    return { result: rows[0] };
  },
);
