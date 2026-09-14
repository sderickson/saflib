import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type {
  NewWorkflowsRequestBody,
  NewWorkflowsResponseBody,
} from "@saflib/new-workflows-spec";
import { createRun } from "@saflib/new-workflows";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";

export const createWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const id = req.params.id as string;
  const body = req.body as NewWorkflowsRequestBody["createWorkflowRun"];

  const definition = ctx.registry.find((w) => w.id === id);
  if (!definition) {
    throw createError(404, `Workflow "${id}" not found`);
  }

  const runId = await createRun(ctx.dbKey, definition, {
    input: body.input,
    cwd: body.cwd ?? ctx.defaultCwd,
    mode: body.mode ?? "print",
    agentConfig: body.agentConfig,
    skipTodos: body.skipTodos,
  });

  // Just-created row; not-found here would be an engine bug, not a client error.
  const { result: run, error } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (error) throw error;

  const response: NewWorkflowsResponseBody["createWorkflowRun"][201] = {
    run: mapRunToWire(run),
  };
  res.status(201).json(response);
});
