import type { WorkflowConfigBody } from "@saflib/new-workflows-spec";
import { defineWorkflow, step } from "../engine.ts";
import { runPromptStep, type PromptStepInput } from "../steps/prompt.ts";
import { runCommandStep, type CommandStepInput } from "../steps/command.ts";
import { runCdStep, type CdStepInput } from "../steps/cd.ts";
import { runNpmScriptStep, type NpmScriptStepInput } from "../steps/npm-script.ts";
import { runCallWorkflowStep, type CallWorkflowStepInput } from "../steps/call-workflow.ts";
import type { WorkflowDefinition, WorkflowStep } from "../types.ts";

type ConfigStep = WorkflowConfigBody["steps"][number];

/**
 * Compiles a validated `WorkflowConfigBody` into a runnable
 * `WorkflowDefinition`, mapping each step to the matching existing
 * primitive. No `inputSchema` — config workflows don't take CLI args in
 * Phase 3. `resolvedWorkflows` must already contain a `WorkflowDefinition`
 * for every `call-workflow` step's `workflowId` — resolving a workflow id
 * is inherently async (a dynamic import, a db lookup), and `WorkflowStep.
 * input` stays synchronous, so the caller (e.g. the CLI's `lookup.ts`)
 * resolves everything up front before calling this.
 */
export function compileConfigWorkflow(
  id: string,
  body: WorkflowConfigBody,
  resolvedWorkflows: Record<string, WorkflowDefinition<any, any>>,
): WorkflowDefinition<Record<string, unknown>, Record<string, unknown>> {
  const steps: WorkflowStep<Record<string, unknown>>[] = body.steps.map((configStep) =>
    compileStep(configStep, resolvedWorkflows),
  );

  return defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
    id,
    description: body.description ?? body.name,
    context: ({ input }) => input,
    steps,
  });
}

function withPause(
  compiled: WorkflowStep<Record<string, unknown>>,
  configStep: { pauseAfter?: boolean; pauseMessage?: string },
): WorkflowStep<Record<string, unknown>> {
  return {
    ...compiled,
    pauseAfter: configStep.pauseAfter,
    pauseMessage: configStep.pauseMessage,
  };
}

function compileStep(
  configStep: ConfigStep,
  resolvedWorkflows: Record<string, WorkflowDefinition<any, any>>,
): WorkflowStep<Record<string, unknown>> {
  switch (configStep.kind) {
    case "prompt":
      return withPause(
        step<PromptStepInput, Record<string, unknown>>("prompt", runPromptStep, () => ({
          prompt: configStep.prompt,
        })),
        configStep,
      );
    case "command":
      return withPause(
        step<CommandStepInput, Record<string, unknown>>("command", runCommandStep, () => ({
          command: configStep.command,
          args: configStep.args,
          ignoreError: configStep.ignoreError,
          errorPrompt: configStep.errorPrompt,
          forceInScript: configStep.forceInScript,
        })),
        configStep,
      );
    case "cd":
      return withPause(
        step<CdStepInput, Record<string, unknown>>("cd", runCdStep, () => ({
          path: configStep.path,
        })),
        configStep,
      );
    case "npm-script":
      return withPause(
        step<NpmScriptStepInput, Record<string, unknown>>(
          "npm-script",
          runNpmScriptStep,
          () => ({
            workspace: configStep.workspace,
            script: configStep.script,
            args: configStep.args,
            ignoreError: configStep.ignoreError,
            errorPrompt: configStep.errorPrompt,
            forceInScript: configStep.forceInScript,
          }),
        ),
        configStep,
      );
    case "call-workflow": {
      const targetDefinition = resolvedWorkflows[configStep.workflowId];
      if (!targetDefinition) {
        throw new Error(
          `No resolved workflow for "${configStep.workflowId}" — every call-workflow step's workflowId must be resolved before compiling.`,
        );
      }
      return withPause(
        step<CallWorkflowStepInput, Record<string, unknown>>(
          "call-workflow",
          runCallWorkflowStep,
          () => ({
            targetDefinition,
            targetInput: (configStep as { input?: Record<string, unknown> }).input ?? {},
          }),
        ),
        configStep,
      );
    }
  }
}
