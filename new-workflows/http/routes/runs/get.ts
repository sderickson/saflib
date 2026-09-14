import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";

export const getWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;

  const { result: run, error } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (error) {
    switch (true) {
      case error instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw error satisfies never;
    }
  }

  const response: NewWorkflowsResponseBody["getWorkflowRun"][200] = {
    run: mapRunToWire(run),
  };
  res.status(200).json(response);
});
