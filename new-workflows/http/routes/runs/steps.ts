import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError } from "@saflib/new-workflows-db";
import { loadWorkflowDefinition, describeWorkflowSteps } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";

export const getWorkflowRunStepsHandler = createHandler(async (req, res) => {
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

  // Same dual lookup as advance/create: a run's `workflow_ref` is either a
  // registered code workflow's id, or a plan file's path.
  if (!ctx.registry.some((w) => w.id === run.workflow_ref) && !/\.(ya?ml|json)$/.test(run.workflow_ref)) {
    throw createError(500, `Workflow "${run.workflow_ref}" is not in the registry`);
  }
  const definition = await loadWorkflowDefinition(run.workflow_ref, ctx.registry, {
    cwd: ctx.defaultCwd,
  });

  const response: NewWorkflowsResponseBody["getWorkflowRunSteps"][200] = {
    steps: describeWorkflowSteps(definition),
  };
  res.status(200).json(response);
});
