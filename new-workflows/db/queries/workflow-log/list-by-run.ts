import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowLogTable } from "../../schemas/workflow-log.ts";
import { and, desc, eq, gt, lt } from "drizzle-orm";

export type ListByRunWorkflowLogParams = {
  run_id: string;
  /** Only rows created strictly after this timestamp (pull newer than a known tip). */
  after?: Date;
  /** Only rows created strictly before this timestamp (page older history). */
  before?: Date;
  /** Page size. Defaults to 100. */
  limit?: number;
};

export type ListByRunWorkflowLogResult = {
  logs: (typeof workflowLogTable.$inferSelect)[];
  /** True when another older (or newer, if `after`-only) page may exist. */
  has_more: boolean;
};

const DEFAULT_LIMIT = 100;

export const listByRunWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunWorkflowLogParams,
  ): Promise<ReturnsError<ListByRunWorkflowLogResult, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const limit = params.limit ?? DEFAULT_LIMIT;

    const filters = [eq(workflowLogTable.run_id, params.run_id)];
    if (params.after) {
      filters.push(gt(workflowLogTable.created_at, params.after));
    }
    if (params.before) {
      filters.push(lt(workflowLogTable.created_at, params.before));
    }

    // Fetch one extra row so callers can tell whether another page exists
    // without a separate COUNT.
    const rows = await db
      .select()
      .from(workflowLogTable)
      .where(and(...filters))
      .orderBy(desc(workflowLogTable.created_at))
      .limit(limit + 1);

    const has_more = rows.length > limit;
    return { result: { logs: rows.slice(0, limit), has_more } };
  },
);
