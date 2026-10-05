import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { listByWorkflowRefWorkflowRun } from "@saflib/new-workflows-db";
import { isRunAdvancing } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";
import { wasRunCancelled } from "../../run-cancellation.ts";

export const listWorkflowRunsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const id = req.params.id as string;

  const { result: runs, error } = await listByWorkflowRefWorkflowRun(ctx.dbKey, {
    workflow_ref: id,
  });
  if (error) throw error;

  const response: NewWorkflowsResponseBody["listWorkflowRuns"][200] = {
    runs: await Promise.all(
      runs.map(async (run) =>
        mapRunToWire(run, isRunAdvancing(ctx.dbKey, run.id), await wasRunCancelled(ctx.dbKey, run)),
      ),
    ),
  };
  res.status(200).json(response);
});
