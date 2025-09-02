import {
  assign,
  raise,
  setup,
  type MachineContext,
  type AnyStateMachine,
  type ContextFrom,
  type InputFrom,
  type AnyActor,
  createActor,
} from "xstate";
import { promptAgent, workflowActions, workflowActors } from "../src/xstate.ts";
import { outputFromContext } from "../src/workflow.ts";
import type { CLIArgument, WorkflowContext } from "../src/types.ts";

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

const promptStepMachine = setup({
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
          ],
        },
        continue: {
          target: "running",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => outputFromContext({ context }),
});

interface JustPromptContext {
  promptText: string;
}

const cliArguments = [
  { name: "prompt", description: "The prompt to be shown" },
  { name: "prompt2", description: "The second prompt to be shown" },
] as const;

const justPromptWorkflow: Workflow<JustPromptContext> = {
  input: cliArguments,
  context: () => ({ promptText: "What is your name?" }),
  id: "prompt-example",
  description: "Just a prompt example",
  templateFiles: {},
  docFiles: {},
  steps: [
    {
      machine: promptStepMachine,
      input: { promptText: "What is your name?" },
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

function makeMachineFromWorkflow<C extends MachineContext & WorkflowContext>(
  workflow: Workflow<C>,
) {
  const actors: Record<string, AnyActor> = {};
  for (const step of workflow.steps) {
    actors[step.machine.id] = createActor(step.machine, { input: step.input });
  }

  const states: Record<string, object> = {};
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stateName = `step${i + 1}`;
    states[stateName] = {
      invoke: {
        input: step.input,
        src: step.machine.id,
      },
    };
  }

  return setup({
    types: {
      input: {} as CreateArgsType<typeof cliArguments>,
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
    initial: "step1",
    states,
    output: ({ context }) => outputFromContext({ context }),
  });
}

const pm = makeMachineFromWorkflow(justPromptWorkflow);
