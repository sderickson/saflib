import {
  assign,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
  type AnyActor,
  createActor,
} from "xstate";
import { promptAgent, workflowActions, workflowActors } from "../src/xstate.ts";
import { outputFromContext } from "../src/workflow.ts";
import type { CLIArgument } from "../src/types.ts";
import type { WorkflowContext, WorkflowInput } from "../src/xstate.ts";

// const machine = setup({
//   types: {
//     input: {} as { foo: string },
//     context: {} as { bar: string },
//   },
// }).createMachine({
//   id: "foo",
//   context: ({ input }) => ({
//     bar: input.foo,
//   }),
//   initial: "bar",
//   states: {
//     bar: {
//       on: {
//         baz: "baz",
//       },
//     },
//   },
// });

// const step: Step<typeof machine> = {
//   machine: machine,
//   input: { foo: "bar" },
// };

/**
 * A step in a workflow with an actor and its corresponding input
 */
type Step<C, Machine extends AnyStateMachine> = {
  machine: Machine;
  input: InputFrom<Machine> | ((context: C) => InputFrom<Machine>);
};

/**
 * A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow.
 */
export interface Workflow<C> {
  input: readonly CLIArgument[];
  context: () => C;
  id: string;
  description: string;

  /**
   * The key is the id to be used in the machine, and the value is the absolute path to the template file.
   */
  templateFiles: Record<string, string>;

  /**
   * The key is the id to be used in the machine, and the value is the absolute path to the doc file.
   */
  docFiles: Record<string, string>;

  steps: Array<Step<C, AnyStateMachine>>;
}

interface WorkflowMachineInput {
  dryRun?: boolean;
}

export interface ChecklistItem {
  description: string;
  subitems?: ChecklistItem[];
}

interface WorkflowMachineContext {
  checklist: Array<ChecklistItem>;
  loggedLast?: boolean;
  systemPrompt?: string;
  dryRun?: boolean;
}

interface PromptMachineInput extends WorkflowMachineInput {
  promptText: string;
}

interface PromptMachineContext extends WorkflowMachineContext {
  promptText: string;
}

export const promptStepMachine = setup({
  types: {
    input: {} as PromptMachineInput,
    context: {} as PromptMachineContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input }) => ({
    checklist: [],
    loggedLast: false,
    systemPrompt: "",
    dryRun: input.dryRun,
    promptText: input.promptText,
  }),
  initial: "running",
  entry: raise({ type: "prompt" }),
  states: {
    running: {
      on: {
        prompt: {
          actions: [
            promptAgent(({ context }) => context.promptText),
            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: context.promptText.split("\n")[0],
                  },
                ];
              },
            }),
            raise({ type: "continue" }),
          ],
        },
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => outputFromContext({ context }),
});

interface JustPromptContext extends WorkflowContext {
  promptText: string;
}

const input = [
  { name: "prompt", description: "The prompt to be shown" },
  { name: "prompt2", description: "The second prompt to be shown" },
] as const;

export const justPromptWorkflow: Workflow<JustPromptContext> = {
  input,
  context: () => {
    return { promptText: "What is your name?", checklist: [] };
  },
  id: "prompt-example",
  description: "Just a prompt example",
  templateFiles: {},
  docFiles: {},
  steps: [
    {
      machine: promptStepMachine,
      input: { promptText: "What is your name?" },
    },
    {
      machine: promptStepMachine,
      input: { promptText: "What is your favorite color?" },
    },
  ],
};

interface WorkflowMachineOutput {
  checklist: ChecklistItem[];
}

type ArrayElementType<T extends readonly unknown[]> = T[number];
type ExtractKeys<T extends readonly { name: string }[]> =
  ArrayElementType<T>["name"];
type CreateArgsType<T extends readonly { name: string }[]> = {
  [K in ExtractKeys<T>]: string;
};

type test = CreateArgsType<typeof input> & WorkflowInput;

export function makeMachineFromWorkflow<
  I extends WorkflowInput,
  C extends WorkflowContext,
>(workflow: Workflow<C>) {
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
    states[stateName] = {
      invoke: {
        input: step.input,
        src: `actor_${i}`,
        onDone: {
          target: `step_${i + 1}`,
        },
      },
    };
  }
  states[`step_${workflow.steps.length}`] = {
    type: "final",
  };

  return setup({
    types: {
      input: {} as I,
      context: {} as C,
      output: {} as WorkflowMachineOutput,
    },
    actions: {
      ...workflowActions,
    },
    actors: {
      ...workflowActors,
      ...actors,
    },
  }).createMachine({
    id: workflow.id,
    description: workflow.description,
    context: workflow.context,
    initial: "step_0",
    states,
    output: ({ context }) => outputFromContext({ context }),
  });
}

export const pm = makeMachineFromWorkflow<test, PromptMachineContext>(
  justPromptWorkflow,
);
