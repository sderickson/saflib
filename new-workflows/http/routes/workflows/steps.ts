import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { loadWorkflowDefinition, describeWorkflowSteps } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";

/**
 * Same as `getWorkflowRunStepsHandler`, but resolved straight from the
 * workflow/plan `id` rather than an existing run's `workflow_ref` — for a
 * sidebar/outline shown before a workflow has ever been started.
 */
export const getWorkflowStepsHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const id = req.params.id as string;

  if (!ctx.registry.some((w) => w.id === id) && !/\.(ya?ml|json)$/.test(id)) {
    throw createError(404, `Workflow "${id}" not found`);
  }
  let definition;
  try {
    definition = await loadWorkflowDefinition(id, ctx.registry, { cwd: ctx.defaultCwd });
  } catch (loadError) {
    throw createError(
      404,
      loadError instanceof Error ? loadError.message : `Workflow "${id}" not found`,
    );
  }

  const response: NewWorkflowsResponseBody["getWorkflowSteps"][200] = {
    steps: describeWorkflowSteps(definition),
  };
  res.status(200).json(response);
});
