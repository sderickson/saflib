import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowLogTable } from "../../schemas/workflow-log.ts";

export type AppendWorkflowLogParams = Pick<
  typeof workflowLogTable.$inferInsert,
  "run_id" | "step_index" | "channel" | "level" | "content"
> & {
  now: Date;
};

export const appendWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: AppendWorkflowLogParams,
  ): Promise<ReturnsError<typeof workflowLogTable.$inferSelect, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const { now, ...rest } = params;

    const inserted = await db
      .insert(workflowLogTable)
      .values({
        ...rest,
        created_at: now,
      })
      .returning();

    return { result: inserted[0]! };
  },
);
