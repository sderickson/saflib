import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { buildStepTree, GotoPathError } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";

export const getWorkflowRunStepTreeHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;

  const { error } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (error) {
    switch (true) {
      case error instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw error satisfies never;
    }
  }

  try {
    const steps = await buildStepTree(ctx.dbKey, runId, ctx.registry, {
      cwd: ctx.defaultCwd,
    });
    const response: NewWorkflowsResponseBody["getWorkflowRunStepTree"][200] = { steps };
    res.status(200).json(response);
  } catch (err) {
    if (err instanceof GotoPathError) {
      throw createError(404, err.message);
    }
    throw err;
  }
});
