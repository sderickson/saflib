import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { getByIdWorkflowRun, WorkflowRunNotFoundError, appendWorkflowLog } from "@saflib/new-workflows-db";
import { advanceRun, loadWorkflowDefinition, type LogChunk } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { publishRunChanged } from "../../change-emitter.ts";

/**
 * `http`'s version of the CLI's `printAndPersist` — persist, don't print.
 * The route responsible for turning `lib`'s per-step output stream into
 * `workflow_logs` rows plus a notify hint (`lib` itself never writes to
 * the db or publishes anything beyond what it returns/streams).
 */
export const advanceWorkflowRunHandler = createHandler(async (req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const runId = req.params.runId as string;

  const { result: run, error: getError } = await getByIdWorkflowRun(ctx.dbKey, { id: runId });
  if (getError) {
    switch (true) {
      case getError instanceof WorkflowRunNotFoundError:
        throw createError(404, "Run not found");
      default:
        throw getError satisfies never;
    }
  }

  // Same dual lookup as run creation (see runs/create.ts): a run's
  // `workflow_ref` is either a registered code workflow's id, or a plan
  // file's path — HTTP requests are stateless, so the definition has to be
  // re-derived on every advance, not just once at creation.
  if (!ctx.registry.some((w) => w.id === run.workflow_ref) && !/\.(ya?ml|json)$/.test(run.workflow_ref)) {
    throw createError(500, `Workflow "${run.workflow_ref}" is not in the registry`);
  }
  const definition = await loadWorkflowDefinition(run.workflow_ref, ctx.registry, {
    cwd: ctx.defaultCwd,
  });

  const stepIndex = run.current_step_index;
  const { output, result } = advanceRun(ctx.dbKey, definition, runId);

  for await (const chunk of output as AsyncIterable<LogChunk>) {
    await appendWorkflowLog(ctx.dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: chunk.channel,
      level: chunk.level,
      content: chunk.content,
      now: new Date(),
    });
  }
  const outcome = await result;
  publishRunChanged(runId);

  const response: NewWorkflowsResponseBody["advanceWorkflowRun"][200] = outcome;
  res.status(200).json(response);
});
