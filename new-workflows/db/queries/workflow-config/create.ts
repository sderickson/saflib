import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowConfigTable } from "../../schemas/workflow-config.ts";

export type CreateWorkflowConfigParams = Pick<
  typeof workflowConfigTable.$inferInsert,
  "name" | "config" | "created_by"
> & {
  now: Date;
};

export const createWorkflowConfig = queryWrapper(
  async (
    dbKey: DbKey,
    params: CreateWorkflowConfigParams,
  ): Promise<ReturnsError<typeof workflowConfigTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const { now, ...rest } = params;

    const inserted = await db
      .insert(workflowConfigTable)
      .values({ ...rest, created_at: now, updated_at: now })
      .returning();

    return { result: inserted[0]! };
  },
);
