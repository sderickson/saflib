import type {
  CreateArgsType,
  WorkflowStep,
  WorkflowDefinition,
} from "./types.ts";
import type {
  WorkflowInput,
  WorkflowContext,
  WorkflowOutput,
  WorkflowRunMode,
} from "./types.ts";
import { workflowActions, workflowActors } from "./xstate.ts";
import {
  assign,
  fromPromise,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
  type OutputFrom,
} from "xstate";
import { contextFromInput } from "./utils.ts";
import type { WorkflowArgument } from "./types.ts";
import { existsSync } from "fs";
import { addNewLinesToString } from "@saflib/utils";
import { getWorkflowLogger } from "./store.ts";

let lastSystemPrompt: string | undefined;

/**
 * Helper, identity function to infer types.
 *
 * By using this function on a Workflow object, it properly types the input object in the context function, and the context in the callbacks for the steps.
 *
 * I'm keeping this separate just because it's good to have the type inference piece separate where it can be messed with independently.
 */
export function defineWorkflow<
  I extends readonly WorkflowArgument[],
  C = any,
>(config: {
  input: I;
  context: (arg: {
    input: CreateArgsType<I> & {
      runMode?: WorkflowRunMode;
      cwd: string;
      systemPrompt?: string;
    };
  }) => C;
  id: string;
  description: string;
  checklistDescription?: (context: C) => string;
  sourceUrl: string;
  templateFiles: Record<string, string>;
  docFiles: Record<string, string>;
  steps: Array<WorkflowStep<C, AnyStateMachine>>;
  afterEach?: (context: C) => void;
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
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stateName = `step_${i}`;
    const validateStateName = `${stateName}_validate`;
    const nextStateName = `step_${i + 1}`;

    const hasValidate = step.validate !== undefined;

    states[stateName] = {
      entry: [
        {
          type: "systemPrompt",
        },
      ],
      invoke: {
        input: ({ context }: { context: Context }) => {
          return {
            ...step.input({ context }),
            // don't need checklist; the machine will compose their own
            runMode: context.runMode,
            templateFiles: context.templateFiles,
            copiedFiles: context.copiedFiles,
            docFiles: context.docFiles,
            agentConfig: context.agentConfig,
            cwd: context.cwd,
          };
        },
        src: `actor_${i}`,
        onDone: {
          target: hasValidate ? validateStateName : nextStateName,
          actions: [
            {
              type: "afterEach",
            },
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

    if (hasValidate) {
      states[validateStateName] = {
        invoke: {
          src: fromPromise(async ({ input }: { input: Context }) => {
            const output = await step.validate({ context: input });
            if (output) {
              const log = getWorkflowLogger();
              log.error(output);
              throw new Error(output);
            }
            return;
          }),
          input: ({ context }: { context: Context }) => context,
          onDone: {
            target: nextStateName,
          },
          onError: {
            target: stateName,
          },
        },
      };
    }
  }
  states[`step_${workflow.steps.length}`] = {
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
      afterEach: ({ context }) => {
        if (workflow.afterEach) {
          workflow.afterEach(context);
        }
      },
      systemPrompt: ({ context }) => {
        if (context.systemPrompt) {
          if (context.systemPrompt !== lastSystemPrompt) {
            console.log("");
            console.log(addNewLinesToString(context.systemPrompt));
            console.log("");
            lastSystemPrompt = context.systemPrompt;
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
        templateFiles: workflow.templateFiles,
        docFiles: workflow.docFiles,
      };
      return context;
    },
    initial: "step_0",
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
    validate?: (arg: { output: OutputFrom<M> }) => Promise<string | undefined>;
  } = {},
): WorkflowStep<C, M> => {
  return {
    machine,
    input,
    validate: options.validate || (() => Promise.resolve(undefined)),
  };
};
