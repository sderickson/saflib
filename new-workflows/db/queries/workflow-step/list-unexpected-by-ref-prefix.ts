import { newWorkflowsDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/utils";
import { queryWrapper } from "@saflib/drizzle";
import type { DbKey } from "@saflib/drizzle";
import { workflowStepTable } from "../../schemas/workflow-step.ts";
import { workflowRunTable } from "../../schemas/workflow-run.ts";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

export type ListUnexpectedByRefPrefixWorkflowStepParams = {
  /** e.g. `product/plans/` — matched literally, not as a LIKE pattern. */
  workflow_ref_prefix: string;
};

export type UnexpectedFilesStepRow = {
  workflow_ref: string;
  run_id: string;
  step_index: number;
  label: string | null;
  commit_hash: string | null;
  unexpected_files: string[];
};

/**
 * Steps with `unexpected_files`, from the most recent run of each
 * workflow_ref under the prefix. Earlier runs are left out: a re-run
 * replaces what an earlier one did, so its findings no longer apply.
 */
export const listUnexpectedByRefPrefixWorkflowStep = queryWrapper(
  async (
    dbKey: DbKey,
    params: ListUnexpectedByRefPrefixWorkflowStepParams,
  ): Promise<ReturnsError<UnexpectedFilesStepRow[], never>> => {
    const db = newWorkflowsDbManager.get(dbKey)!;
    const prefix = params.workflow_ref_prefix;

    // Same newest-first order as `listByWorkflowRefWorkflowRun`: rowid
    // breaks ties between runs created in the same second.
    const latestRunForRef = sql`(
      select latest.id from ${workflowRunTable} as latest
      where latest.workflow_ref = ${workflowRunTable.workflow_ref}
      order by latest.created_at desc, latest.rowid desc
      limit 1
    )`;

    const rows = await db
      .select({
        workflow_ref: workflowRunTable.workflow_ref,
        run_id: workflowStepTable.run_id,
        step_index: workflowStepTable.step_index,
        label: workflowStepTable.label,
        commit_hash: workflowStepTable.commit_hash,
        unexpected_files: workflowStepTable.unexpected_files,
      })
      .from(workflowStepTable)
      .innerJoin(workflowRunTable, eq(workflowRunTable.id, workflowStepTable.run_id))
      .where(
        and(
          isNotNull(workflowStepTable.unexpected_files),
          sql`substr(${workflowRunTable.workflow_ref}, 1, ${prefix.length}) = ${prefix}`,
          sql`${workflowRunTable.id} = ${latestRunForRef}`,
        ),
      )
      .orderBy(asc(workflowRunTable.workflow_ref), asc(workflowStepTable.step_index));

    return {
      result: rows.flatMap((row) =>
        row.unexpected_files?.length
          ? [{ ...row, unexpected_files: row.unexpected_files }]
          : [],
      ),
    };
  },
);
