import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type {
  NewWorkflowsRequestBody,
  NewWorkflowsResponseBody,
} from "@saflib/new-workflows-spec";
import { createRun, loadWorkflowDefinition } from "@saflib/new-workflows";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { mapRunToWire } from "../../map-run.ts";

export const createWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const id = req.params.id as string;
  const body = req.body as NewWorkflowsRequestBody["createWorkflowRun"];

  // `id` is either a registered workflow's id, or a plan file's `path`
  // (from GET /plans) — same dual lookup the CLI's `kickoff` supports,
  // MINUS the `.ts`/`./` code-file form: that branch dynamic-`import()`s
  // whatever path it's given, fine for a trusted local CLI invocation but
  // not something an HTTP endpoint should do with a client-supplied path.
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
    // Never advancing yet — this run was just created, nothing has called
    // advance on it.
    run: mapRunToWire(run, false),
  };
  res.status(201).json(response);
});
