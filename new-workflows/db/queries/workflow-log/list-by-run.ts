import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { getTableColumns, sql, and, eq, type SQL } from "drizzle-orm";
import { workflowLogTable, type WorkflowLogEntity } from "../../schemas/workflow-log.ts";

/**
 * A log row plus its insertion sequence (SQLite `rowid`). `created_at` is
 * only second-precision, so many rows share a timestamp — `seq` is the one
 * total order, and the only safe pagination cursor.
 */
export type WorkflowLogRow = WorkflowLogEntity & { seq: number };

export type ListByRunWorkflowLogParams = {
  run_id: string;
  /** Only rows inserted after this `seq` (pull newer than a known tip). */
  after_seq?: number;
  /** Only rows inserted before this `seq` (page older history). */
  before_seq?: number;
  /**
   * With `after_seq` and no `before_seq`: return the oldest `limit` rows
   * after the cursor (the next page toward the present) instead of the
   * newest ones. Used when the viewport is anchored in the middle of a log
   * and the reader scrolls down.
   */
  afterContiguous?: boolean;
  /** Anchor the page at the earliest log for this step, then the next `limit` rows. */
  step_index?: number;
  /** Anchor the page at this row (e.g. a direct message), then the next `limit` rows. */
  anchor_seq?: number;
  /** Page size. Defaults to 100. */
  limit?: number;
};

export type ListByRunWorkflowLogResult = {
  /** Newest first. */
  logs: WorkflowLogRow[];
  /** True when another older page may exist before the oldest row returned. */
  has_more: boolean;
  /** True when another newer page may exist after the newest row returned. */
  has_more_newer: boolean;
};

const DEFAULT_LIMIT = 100;

const seq = sql<number>`${workflowLogTable}.rowid`;
const rowColumns = { ...getTableColumns(workflowLogTable), seq };

export const listByRunWorkflowLog = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListByRunWorkflowLogParams,
  ): Promise<ReturnsError<ListByRunWorkflowLogResult, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const runFilter = eq(workflowLogTable.run_id, params.run_id);

    const hasOlder = async (oldestSeq: number | undefined) => {
      if (oldestSeq === undefined) return false;
      const older = await db
        .select({ seq })
        .from(workflowLogTable)
        .where(and(runFilter, sql`${seq} < ${oldestSeq}`))
        .limit(1);
      return older.length > 0;
    };

    const anchored =
      (params.step_index !== undefined || params.anchor_seq !== undefined) &&
      params.after_seq === undefined &&
      params.before_seq === undefined;
    if (anchored) {
      let anchor = params.anchor_seq;
      if (anchor === undefined) {
        const anchorRows = await db
          .select({ seq })
          .from(workflowLogTable)
          .where(and(runFilter, eq(workflowLogTable.step_index, params.step_index!)))
          .orderBy(sql`${seq} asc`)
          .limit(1);
        anchor = anchorRows[0]?.seq;
      }
      if (anchor === undefined) {
        return { result: { logs: [], has_more: false, has_more_newer: false } };
      }
      const rows = await db
        .select(rowColumns)
        .from(workflowLogTable)
        .where(and(runFilter, sql`${seq} >= ${anchor}`))
        .orderBy(sql`${seq} asc`)
        .limit(limit + 1);
      const page = rows.slice(0, limit);
      return {
        result: {
          logs: page.reverse(),
          has_more: await hasOlder(anchor),
          has_more_newer: rows.length > limit,
        },
      };
    }

    const contiguousForward = Boolean(
      params.after_seq !== undefined && params.afterContiguous && params.before_seq === undefined,
    );
    const filters: SQL[] = [runFilter];
    if (params.after_seq !== undefined) filters.push(sql`${seq} > ${params.after_seq}`);
    if (params.before_seq !== undefined) filters.push(sql`${seq} < ${params.before_seq}`);

    // Fetch one extra row so callers can tell whether another page exists
    // without a separate COUNT.
    const rows = await db
      .select(rowColumns)
      .from(workflowLogTable)
      .where(and(...filters))
      .orderBy(contiguousForward ? sql`${seq} asc` : sql`${seq} desc`)
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
        // A `before_seq` page is older than a cursor the caller already has,
        // and a tip page is the newest rows. Neither direction's next fetch
        // is "newer than this page" except the contiguous-forward case above.
        has_more_newer: false,
      },
    };
  },
);
