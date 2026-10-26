import path from "node:path";
import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listUnexpectedByRefPrefixWorkflowStep } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";

export const listPlanUnexpectedChangesHandler = createHandler(async (_req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  if (!ctx.plansRoot) {
    throw createError(500, "This host hasn't configured a plans folder.");
  }
  // Plan runs' workflow_ref is the plan file's path relative to defaultCwd.
  const prefix = `${path.relative(ctx.defaultCwd, ctx.plansRoot)}/`;
  const { result: rows } = await listUnexpectedByRefPrefixWorkflowStep(ctx.dbKey, {
    workflow_ref_prefix: prefix,
  });

  const response: NewWorkflowsResponseBody["listPlanUnexpectedChanges"][200] = {
    changes: (rows ?? []).map((row) => ({
      workflow_ref: row.workflow_ref,
      run_id: row.run_id,
      step_index: row.step_index,
      ...(row.label ? { label: row.label } : {}),
      ...(row.commit_hash ? { commit_hash: row.commit_hash } : {}),
      files: row.unexpected_files,
    })),
  };
  res.status(200).json(response);
});
