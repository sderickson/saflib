import type {
  CreateArgsType,
  WorkflowStep,
  WorkflowDefinition,
} from "./types.ts";
import type {
  WorkflowInput,
  WorkflowContext,
  WorkflowOutput,
  WorkflowExecutionMode,
} from "./types.ts";
import { workflowActions, workflowActors } from "./xstate.ts";
import {
  assign,
  fromPromise,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
} from "xstate";
import { contextFromInput } from "./utils.ts";
import type { WorkflowArgument } from "./types.ts";
import { existsSync } from "fs";
import { addNewLinesToString } from "@saflib/utils";
import { getWorkflowLogger } from "./store.ts";
import { addPendingMessage } from "./agents/message.ts";

import { handleGitChanges, commitChanges } from "./version/git.ts";

let lastSystemPrompt: string | undefined;

/**
 * Helper, identity function to infer types.
 *
 * By using this function on a Workflow object, it properly types the input object in the context function, and the context in the callbacks for the steps.
 */
export function defineWorkflow<
  I extends readonly WorkflowArgument[],
  C = any,
>(config: {
  input: I;
  context: (arg: {
    input: CreateArgsType<I> & {
      runMode?: WorkflowExecutionMode;
      cwd: string;
      prompt?: string;
    };
  }) => C;
  id: string;
  description: string;
  checklistDescription?: (context: C) => string;
  sourceUrl: string;
  templateFiles: Record<string, string>;
  docFiles: Record<string, string>;
  steps: Array<WorkflowStep<C, AnyStateMachine>>;
  versionControl?: {
    allowPaths?: string[] | (({ context }: { context: C }) => string[]);
  };
}): WorkflowDefinition<I, C> {
  return config;
}

/**
 * Implementation of the makeMachineFromWorkflow function.
 */
function _makeWorkflowMachine<I extends readonly WorkflowArgument[], C>(
  workflow: WorkflowDefinition<I, C>,
) {
  type Input = CreateArgsType<I> & WorkflowInput;
  type Context = C & WorkflowContext;

  for (const [key, value] of Object.entries(workflow.templateFiles)) {
    if (!existsSync(value)) {
      console.log("Invalid template file path:", value);
      throw new Error(`Missing template file "${key}" for ${workflow.id}`);
    }
  }
  for (const [key, value] of Object.entries(workflow.docFiles)) {
    if (!existsSync(value)) {
      console.log("Invalid doc file path:", value);
      throw new Error(`Missing doc file ${key} for ${workflow.id}`);
    }
  }

  const actors: Record<string, AnyStateMachine> = {};
  for (let i = 0; i < workflow.steps.length; i++) {
    const actor_id = `actor_${i}`;
    const step = workflow.steps[i];
    actors[actor_id] = step.machine;
  }

  const states: Record<string, object> = {};
  const stepNames = workflow.steps.map(
    (step, index) => `step_${index}_${step.machine.id}`,
  );
  const lastStepName = `step_${workflow.steps.length}_finalize`;
  stepNames.push(lastStepName);

  let retries = 0;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stateName = stepNames[i];
    const validateStateName = `${stateName}_validate`;
    const nextStateName = stepNames[i + 1];

    states[stateName] = {
      always: [
        {
          guard: ({ context }: { context: Context }) => {
            return step.skipIf({ context });
          },
          target: nextStateName,
        },
      ],
      entry: [
        {
          type: "prompt",
        },
      ],
      invoke: {
        input: ({ context }: { context: Context }) => {
          // bit of a hack
          if (context.runMode === "script") {
            console.log("-------------------------------------------------");
            console.log(`${workflow.id} INVOKES ${step.machine.id}`);
            console.log("-------------------------------------------------");
          }

          return {
            ...step.input({ context }),
            // don't need checklist; the machine will compose their own
            workflowId: context.workflowId,
            runMode: context.runMode,
            templateFiles: context.templateFiles,
            copiedFiles: context.copiedFiles,
            docFiles: context.docFiles,
            agentConfig: context.agentConfig,
            cwd: context.cwd,
            manageVersionControl: context.manageVersionControl,
            skipTodos: context.skipTodos,
          };
        },
        src: `actor_${i}`,
        onDone: {
          target: validateStateName,
          actions: [
            assign({
              agentConfig: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                return output.agentConfig || context.agentConfig;
              },
              checklist: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                return [...context.checklist, output.checklist];
              },
              copiedFiles: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                if (output.copiedFiles) {
                  return { ...context.copiedFiles, ...output.copiedFiles };
                }
                return context.copiedFiles;
              },
              cwd: ({ context, event }) => {
                const output: WorkflowOutput = event.output;
                if (output.newCwd) {
                  return output.newCwd;
                }
                return context.cwd;
              },
            }),
          ],
        },
      },
    };

    states[validateStateName] = {
      invoke: {
        src: fromPromise(async ({ input }: { input: Context }) => {
          if (input.runMode === "dry" || input.runMode === "checklist") {
            return;
          }

          if (input.manageVersionControl) {
            let allowPaths:
              | string[]
              | ((context: Context) => string[])
              | undefined = undefined;
            if (typeof workflow.versionControl?.allowPaths === "function") {
              allowPaths = workflow.versionControl.allowPaths({
                context: input,
              });
            } else {
              allowPaths = workflow.versionControl?.allowPaths;
            }
            const successful = await handleGitChanges({
              workflowId: workflow.id,
              context: input,
              checklistDescription:
                workflow.checklistDescription?.(input) || workflow.description,
              allowPaths,
            });
            if (!successful) {
              throw new Error("Failed to handle git changes");
            }
          }

          if (step.validate) {
            const output = await step.validate({ context: input });
            if (output) {
              addPendingMessage(output);
              const log = getWorkflowLogger();
              log.error(output);
              throw new Error(output);
            }
          }

          // reset retries for the next step
          retries = 0;

          if (input.manageVersionControl && step.commitAfter) {
            let message: string;
            if (typeof step.commitAfter.message === "function") {
              message = step.commitAfter.message({ context: input });
            } else {
              message = step.commitAfter.message;
            }
            await commitChanges({
              message,
            });
          }
        }),
        input: ({ context }: { context: Context }) => context,
        onDone: {
          target: nextStateName,
        },
        onError: [
          {
            guard: ({ context, event }: { context: Context; event: any }) => {
              // If validations failed, and we're running things in a way that *ought* to be correct each time, then error.
              if (
                context.runMode === "dry" ||
                context.runMode === "checklist" ||
                context.runMode === "script" ||
                context.agentConfig?.cli === "mock-agent"
              ) {
                throw new Error(event.error);
              }

              // Also error if there have been too many retries
              retries++;
              if (retries > 3) {
                throw new Error(`Failed to validate step ${step.machine.id} after 3 retries: ${event.error}`);
              }
              return true;
            },
            target: stateName,
          },
        ],
      },
    };
  }
  states[lastStepName] = {
    invoke: {
      src: fromPromise(async ({ input }: { input: Context }) => {
        if (input.runMode === "dry" || input.runMode === "checklist" || input.runMode === "script") {
          return;
        }
        if (input.manageVersionControl) {
          await commitChanges({
            workflow: workflow,
            context: input,
          });
        }
        return;
      }),
      input: ({ context }: { context: Context }) => context,
      onDone: {
        target: "end",
      },
    },
  };
  states["end"] = {
    type: "final",
  };

  return setup({
    types: {
      input: {} as Input,
      context: {} as Context,
      output: {} as WorkflowOutput,
    },
    actions: {
      ...workflowActions,
      prompt: ({ context }) => {
        if (context.prompt) {
          if (context.prompt !== lastSystemPrompt) {
            addPendingMessage(context.prompt);
            console.log("");
            console.log(addNewLinesToString(context.prompt));
            console.log("");
            lastSystemPrompt = context.prompt;
          }
        }
      },
    },
    actors: {
      ...workflowActors,
      ...actors,
    },
  }).createMachine({
    entry: raise({ type: "start" }),
    id: workflow.id,
    description: workflow.description,
    context: ({ input }) => {
      const context: Context = {
        ...workflow.context({
          input: {
            ...input,
            cwd: input.cwd || process.cwd(),
          },
        }),
        ...contextFromInput(input),
        workflowId: workflow.id,
        templateFiles: workflow.templateFiles,
        docFiles: workflow.docFiles,
      };
      return context;
    },
    initial: stepNames[0],
    states,
    output: ({ context }) => ({
      checklist: {
        description:
          workflow.checklistDescription?.(context) || workflow.description,
        subitems: context.checklist,
      },
      agentConfig: context.agentConfig,
    }),
  });
}

/**
 * Takes a WorkflowsDefinition, as well as its Context and Input types, and creates an XState machine.
 *
 * This basically translates my simplified and scoped workflow machine definition to the full XState machine definition.
 */
export const makeWorkflowMachine = <C, I extends readonly WorkflowArgument[]>(
  config: WorkflowDefinition<I, C>,
) => {
  return _makeWorkflowMachine(defineWorkflow(config));
};

/**
 * Helper function for defining a step in a workflow, enforcing types properly.
 */
export const step = <C, M extends AnyStateMachine>(
  machine: M,
  input: (arg: { context: C & WorkflowContext }) => InputFrom<M>,
  options: {
    validate?: (arg: {
      context: C & WorkflowContext;
    }) => Promise<string | undefined>;
    skipIf?: (arg: { context: C & WorkflowContext }) => boolean;
    commitAfter?: {
      message: string | ((arg: { context: C & WorkflowContext }) => string);
    };
  } = {},
): WorkflowStep<C, M> => {
  return {
    machine,
    input,
    validate: options.validate || (() => Promise.resolve(undefined)),
    skipIf: options.skipIf || (() => false),
    commitAfter: options.commitAfter || undefined,
  };
};
