import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listByWorkflowRefWorkflowRun } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";

export const listWorkflowRunsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const id = req.params.id as string;

  const { result: runs, error } = await listByWorkflowRefWorkflowRun(ctx.dbKey, {
    workflow_ref: id,
  });
  if (error) throw error;

  const response: NewWorkflowsResponseBody["listWorkflowRuns"][200] = {
    runs: runs.map(mapRunToWire),
  };
  res.status(200).json(response);
});
