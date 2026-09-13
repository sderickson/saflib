import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowStepTable } from "../../schemas/workflow-step.ts";

export type CreateWorkflowStepParams = Pick<
  typeof workflowStepTable.$inferInsert,
  "run_id" | "step_index" | "kind"
> & {
  now: Date;
};

/** Inserts a `running` row for a single step attempt. */
export const createWorkflowStep = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateWorkflowStepParams,
  ): Promise<ReturnsError<typeof workflowStepTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const { now, ...rest } = params;

    const inserted = await db
      .insert(workflowStepTable)
      .values({
        ...rest,
        status: "running",
        started_at: now,
      })
      .returning();

    return { result: inserted[0]! };
  },
);
