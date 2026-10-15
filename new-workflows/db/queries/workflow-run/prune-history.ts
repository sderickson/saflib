import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { sql } from "drizzle-orm";

export type PruneHistoryWorkflowRunParams = {
  /** Delete raw agent output for finished runs last updated before this. */
  rawBefore: Date;
  /** Delete logs (and raw output) for finished runs last updated before this. */
  logsBefore: Date;
  /** Stamped as `logs_pruned_at`. */
  now: Date;
};

export type PruneHistoryWorkflowRunResult = {
  rawRowsDeleted: number;
  logRowsDeleted: number;
  /** Runs (nested ones included) whose logs were deleted this time. */
  runsPruned: number;
};

/**
 * Ages out the heavy rows of old runs and keeps the small ones: runs,
 * steps, and agent turns stay indefinitely (commit trailers and
 * `workflow_step.commit_hash` point at them, and they hold the cost
 * history); `workflow_agent_turn_raw` and `workflow_log` rows go.
 *
 * Works on whole `call-workflow` trees, picked by their root: logs are
 * filed under the root, and a nested run means nothing without it. Only
 * `done` and `failed` roots are eligible; anything running or waiting on
 * a person is left alone however old it is.
 */
export const pruneHistoryWorkflowRun = queryWrapper(
  async (
    dbKey: DbKey,
    params: PruneHistoryWorkflowRunParams,
  ): Promise<ReturnsError<PruneHistoryWorkflowRunResult, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;

    // `updated_at`/`logs_pruned_at` are unix seconds.
    const seconds = (d: Date) => Math.floor(d.getTime() / 1000);
    const treeOfRootsBefore = (cutoff: Date) => sql`
      with recursive tree(id) as (
        select id from workflow_run
        where parent_run_id is null
          and status in ('done', 'failed')
          and updated_at < ${seconds(cutoff)}
        union all
        select r.id from workflow_run r join tree t on r.parent_run_id = t.id
      )
      select id from tree`;

    const raw = db.run(sql`
      delete from workflow_agent_turn_raw where turn_id in (
        select id from workflow_agent_turn
        where run_id in (${treeOfRootsBefore(params.rawBefore)})
      )`);
    const logs = db.run(sql`
      delete from workflow_log where run_id in (${treeOfRootsBefore(params.logsBefore)})`);
    const runs = db.run(sql`
      update workflow_run set logs_pruned_at = ${seconds(params.now)}
      where logs_pruned_at is null and id in (${treeOfRootsBefore(params.logsBefore)})`);

    return {
      result: {
        rawRowsDeleted: raw.changes,
        logRowsDeleted: logs.changes,
        runsPruned: runs.changes,
      },
    };
  },
);

/**
 * Shrinks the database file once enough of it is free pages. Deleted rows
 * only free pages for sqlite to reuse; the file never gets smaller without
 * a VACUUM, which rewrites the whole file and blocks while it does — so
 * only when it's worth it.
 */
export const vacuumIfMostlyFreeWorkflowDb = queryWrapper(
  async (
    dbKey: DbKey,
    params: { minFreeFraction: number },
  ): Promise<ReturnsError<{ vacuumed: boolean; freePages: number; pages: number }, never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const pages = Number(db.get<{ n: number }>(sql`select page_count as n from pragma_page_count()`)?.n ?? 0);
    const freePages = Number(
      db.get<{ n: number }>(sql`select freelist_count as n from pragma_freelist_count()`)?.n ?? 0,
    );
    const vacuumed = pages > 0 && freePages / pages >= params.minFreeFraction;
    if (vacuumed) db.run(sql`vacuum`);
    return { result: { vacuumed, freePages, pages } };
  },
);
