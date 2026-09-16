import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { cancelRunAndDescendants } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";

export const cancelWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;

  // The run the user is watching (e.g. the root of a plan) is often just
  // blocked on a nested `call-workflow` child — see `cancelRunAndDescendants`
  // for why cancelling has to walk down to whichever descendant actually has
  // an agent running.
  const cancelled = await cancelRunAndDescendants(ctx.dbKey, runId);

  const response: NewWorkflowsResponseBody["cancelWorkflowRun"][200] = { cancelled };
  res.status(200).json(response);
});
