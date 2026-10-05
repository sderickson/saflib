import { newWorkflowsDbManager } from "../../instances.ts";
import { WorkflowConfigNotFoundError } from "../../errors.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowConfigTable } from "../../schemas/workflow-config.ts";
import { eq } from "drizzle-orm";

export type GetByIdWorkflowConfigParams = {
  id: (typeof workflowConfigTable.$inferSelect)["id"];
};

export type GetByIdWorkflowConfigError = WorkflowConfigNotFoundError;

export const getByIdWorkflowConfig = queryWrapper(
  async (
    dbKey: DbKey,
    params: GetByIdWorkflowConfigParams,
  ): Promise<
    ReturnsError<typeof workflowConfigTable.$inferSelect, GetByIdWorkflowConfigError>
  > => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    const rows = await db
      .select()
      .from(workflowConfigTable)
      .where(eq(workflowConfigTable.id, params.id))
      .limit(1);

    if (!rows[0]) {
      return { error: new WorkflowConfigNotFoundError() };
    }

    return { result: rows[0] };
  },
);
