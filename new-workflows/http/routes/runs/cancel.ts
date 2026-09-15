import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { cancelActiveAgentProcess } from "@saflib/new-workflows";

export const cancelWorkflowRunHandler = createHandler(async (req, res) => {
  const runId = req.params.runId as string;

  const cancelled = cancelActiveAgentProcess(runId);

  const response: NewWorkflowsResponseBody["cancelWorkflowRun"][200] = { cancelled };
  res.status(200).json(response);
});
