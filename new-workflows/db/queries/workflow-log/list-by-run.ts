import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowLogTable } from "../../schemas/workflow-log.ts";
import { and, asc, desc, eq, gt, gte, lt } from "drizzle-orm";

export type ListByRunWorkflowLogParams = {
  run_id: string;
  /** Only rows created strictly after this timestamp (pull newer than a known tip). */
  after?: Date;
  /** Only rows created strictly before this timestamp (page older history). */
  before?: Date;
  /**
   * With `after` and no `before`: return the oldest `limit` rows after the
   * cursor (the next page toward the present) instead of the newest ones.
   * Used when the viewport is anchored in the middle of a log and the
   * reader scrolls down.
   */
  afterContiguous?: boolean;
  /** Anchor the page at the earliest log for this step, then the next `limit` rows. */
  step_index?: number;
  /** Page size. Defaults to 100. */
  limit?: number;
};

export type ListByRunWorkflowLogResult = {
  logs: (typeof workflowLogTable.$inferSelect)[];
  /** True when another older page may exist before the oldest row returned. */
  has_more: boolean;
  /** True when another newer page may exist after the newest row returned. */
  has_more_newer: boolean;
};

const DEFAULT_LIMIT = 100;

export const listByRunWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunWorkflowLogParams,
  ): Promise<ReturnsError<ListByRunWorkflowLogResult, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const runFilter = eq(workflowLogTable.run_id, params.run_id);

    if (params.step_index !== undefined && !params.after && !params.before) {
      const anchorRows = await db
        .select({ created_at: workflowLogTable.created_at })
        .from(workflowLogTable)
        .where(and(runFilter, eq(workflowLogTable.step_index, params.step_index)))
        .orderBy(asc(workflowLogTable.created_at))
        .limit(1);
      const anchor = anchorRows[0]?.created_at;
      if (!anchor) {
        return { result: { logs: [], has_more: false, has_more_newer: false } };
      }
      const rows = await db
        .select()
        .from(workflowLogTable)
        .where(and(runFilter, gte(workflowLogTable.created_at, anchor)))
        .orderBy(asc(workflowLogTable.created_at))
        .limit(limit + 1);
      const has_more_newer = rows.length > limit;
      const page = rows.slice(0, limit);
      const oldest = page[0]?.created_at;
      const older = oldest
        ? await db
            .select({ id: workflowLogTable.id })
            .from(workflowLogTable)
            .where(and(runFilter, lt(workflowLogTable.created_at, oldest)))
            .limit(1)
        : [];
      return {
        result: {
          logs: page.reverse(),
          has_more: older.length > 0,
          has_more_newer,
        },
      };
    }

    const contiguousForward = Boolean(params.after && params.afterContiguous && !params.before);
    const filters = [runFilter];
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
      .orderBy(
        contiguousForward
          ? asc(workflowLogTable.created_at)
          : desc(workflowLogTable.created_at),
      )
      .limit(limit + 1);

    const overflow = rows.length > limit;
    const page = rows.slice(0, limit);
    if (contiguousForward) {
      return {
        result: {
          logs: page.reverse(),
          has_more: false,
          has_more_newer: overflow,
        },
      };
    }

    return {
      result: {
        logs: page,
        has_more: overflow,
        // A `before` page is older than a cursor the caller already has, and
        // a tip page is the newest rows. Neither direction's next fetch is
        // "newer than this page" except the contiguous-forward case above.
        has_more_newer: false,
      },
    };
  },
);
