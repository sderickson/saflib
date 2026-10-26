import { createHandler } from "@saflib/express";
import type {
  NewWorkflowsRequestBody,
  NewWorkflowsResponseBody,
} from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { getRunDriver } from "../../run-driver.ts";

export const driveWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;
  const { mode, ...options } = req.body as NewWorkflowsRequestBody["driveWorkflowRun"];

  const drive = await getRunDriver(ctx.dbKey).drive(ctx, runId, mode, options);

  const response: NewWorkflowsResponseBody["driveWorkflowRun"][202] = { drive };
  res.status(202).json(response);
});
