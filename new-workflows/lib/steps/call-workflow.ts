import { getChildByParentStepWorkflowRun } from "@saflib/new-workflows-db";
import type { StepFn, WorkflowDefinition } from "../types.ts";
import { createRun, advanceRun } from "../engine.ts";

export interface CallWorkflowStepInput {
  targetDefinition: WorkflowDefinition<any, any>;
  targetInput: Record<string, unknown>;
}

/**
 * Calls another workflow as a nested child run, blocking this step until
 * it completes. Available to both code- and config-defined workflows
 * (the old engine's `makeWorkflowMachine(OtherWorkflowDefinition)`
 * nesting, as a normal step instead of a workflow-definition-level
 * concept). See spec.md's "nested calls as child runs" design.
 *
 * Transparent to the caller: the child's `awaiting_prompt`/`awaiting_user`
 * outcome is returned as-is, so a caller driving only the *root* run via
 * `advanceRun` never needs to know a nested call happened — the bubbled
 * status/prompt is exactly what it would see for a non-nested step.
 */
export const runCallWorkflowStep: StepFn<CallWorkflowStepInput> = async (input, ctx) => {
  const { result: existingChild, error: lookupError } = await getChildByParentStepWorkflowRun(
    ctx.dbKey,
    { parent_run_id: ctx.runId, parent_step_index: ctx.stepIndex },
  );
  if (lookupError) throw lookupError;

  const childRunId =
    existingChild?.id ??
    (await createRun(ctx.dbKey, input.targetDefinition, {
      input: input.targetInput,
      cwd: ctx.cwd,
      mode: ctx.mode,
      agentConfig: ctx.agentConfig,
      skipTodos: ctx.skipTodos,
      parentRunId: ctx.runId,
      parentStepIndex: ctx.stepIndex,
    }));

  // Drive the child to its own natural stopping point — same "keep going
  // while success" loop the CLI's advance-loop.ts runs for a top-level
  // run, just nested. Without this, a child step succeeding (but the
  // child workflow not yet done) would bubble straight up as *this*
  // step's own success, prematurely advancing the parent past the whole
  // nested call after the child's first step.
  while (true) {
    const { output, result } = advanceRun(ctx.dbKey, input.targetDefinition, childRunId);
    for await (const chunk of output) {
      ctx.log(chunk);
    }
    const childOutcome = await result;

    if (childOutcome.status === "success") continue;
    if (childOutcome.status === "done") return { status: "success" };
    return childOutcome;
  }
};
