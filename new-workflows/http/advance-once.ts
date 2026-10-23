import createError from "http-errors";
import { getByIdWorkflowRun, WorkflowRunNotFoundError, appendWorkflowLog } from "@saflib/new-workflows-db";
import { advanceRun, loadWorkflowDefinition, type LogChunk, type StepResult } from "@saflib/new-workflows";
import type { NewWorkflowsHttpContext } from "./context.ts";
import { publishRunChanged } from "./change-emitter.ts";

export interface AdvanceOnceOptions {
  revert?: boolean;
  skip?: boolean;
  extraPrompt?: string;
}

/**
 * Runs a run's next step, persisting its output to `workflow_logs` and
 * publishing a change hint per chunk — shared by the advance route and the
 * run driver. `http`'s version of the CLI's `printAndPersist`: persist,
 * don't print (`lib` itself never writes to the db or publishes anything
 * beyond what it returns/streams).
 */
export async function advanceOnce(
  ctx: NewWorkflowsHttpContext,
  runId: string,
  options: AdvanceOnceOptions = {},
): Promise<StepResult> {
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
  const { output, result } = advanceRun(ctx.dbKey, definition, runId, {
    revert: options.revert,
    skip: options.skip,
    extraPrompt: options.extraPrompt,
    workspace: ctx.workspace,
  });

  for await (const chunk of output as AsyncIterable<LogChunk>) {
    await appendWorkflowLog(ctx.dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: chunk.channel,
      level: chunk.level,
      content: chunk.content,
      source_run_id: chunk.sourceRunId ?? runId,
      source_step_index: chunk.sourceStepIndex ?? stepIndex,
      now: new Date(),
    });
    // Per-chunk, not just once at the end: a step (an agent turn
    // especially) can run for a long time, and the SSE hint is what tells
    // the frontend to go refetch logs — without this, everything shows up
    // in one batch only once the whole step finishes.
    publishRunChanged(runId);
  }
  const outcome = await result;

  // The engine only returns a step's error message in this result — it's
  // not part of the output stream drained above, so persist it as its own
  // log line too. Otherwise the message only survives as long as whoever
  // made this call holds onto it (gone on reload, or if a different client
  // polls the run afterwards).
  if (outcome.status === "error") {
    await appendWorkflowLog(ctx.dbKey, {
      run_id: runId,
      step_index: stepIndex,
      channel: "tool",
      level: "error",
      content: outcome.message,
      now: new Date(),
    });
  }

  publishRunChanged(runId);
  return outcome;
}
