import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { getTableColumns, sql, and, eq } from "drizzle-orm";
import { workflowLogTable } from "../../schemas/workflow-log.ts";
import type { WorkflowLogRow } from "./list-by-run.ts";

export type ListDirectMessagesWorkflowLogParams = {
  run_id: string;
  /**
   * Content of the `tool` row written right before each direct message's
   * `agent-input` row (`FREEFORM_MESSAGE_MARKER` in `@saflib/new-workflows`).
   * Passed in so this package stays agnostic of the engine's wording.
   */
  marker: string;
};

const seq = sql<number>`${workflowLogTable}.rowid`;

/**
 * A run's direct (freeform) agent messages — the `agent-input` row that
 * follows each marker row — oldest first.
 */
export const listDirectMessagesWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListDirectMessagesWorkflowLogParams,
  ): Promise<ReturnsError<WorkflowLogRow[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const runFilter = eq(workflowLogTable.run_id, params.run_id);

    const markers = await db
      .select({ seq })
      .from(workflowLogTable)
      .where(
        and(
          runFilter,
          eq(workflowLogTable.channel, "tool"),
          eq(workflowLogTable.content, params.marker),
        ),
      )
      .orderBy(sql`${seq} asc`);

    const messages: WorkflowLogRow[] = [];
    for (const marker of markers) {
      const [next] = await db
        .select({ ...getTableColumns(workflowLogTable), seq })
        .from(workflowLogTable)
        .where(and(runFilter, sql`${seq} > ${marker.seq}`))
        .orderBy(sql`${seq} asc`)
        .limit(1);
      if (next?.channel === "agent-input") messages.push(next);
    }
    return { result: messages };
  },
);
