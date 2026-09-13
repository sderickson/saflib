import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowRunTable } from "../../schemas/workflow-run.ts";

export type CreateWorkflowRunParams = Pick<
  typeof workflowRunTable.$inferInsert,
  | "workflow_source"
  | "workflow_ref"
  | "input"
  | "mode"
  | "skip_todos"
  | "cwd"
  | "agent_config"
  | "parent_run_id"
  | "parent_step_index"
> & {
  now: Date;
};

export const createWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateWorkflowRunParams,
  ): Promise<ReturnsError<typeof workflowRunTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const { now, ...rest } = params;

    const inserted = await db
      .insert(workflowRunTable)
      .values({
        ...rest,
        status: "pending",
        current_step_index: 0,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return { result: inserted[0]! };
  },
);
