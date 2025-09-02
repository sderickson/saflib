import {
  assign,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
} from "xstate";
import { promptAgent, workflowActions, workflowActors } from "../src/xstate.ts";
import { outputFromContext } from "../src/workflow.ts";
import type { CLIArgument } from "../src/types.ts";

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
type Step<Machine extends AnyStateMachine> = {
  machine: Machine;
  input: InputFrom<Machine>;
};

/**
 * A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow.
 */
export interface Workflow {
  input: Array<CLIArgument>;
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

  steps: Array<Step<AnyStateMachine>>;
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

const promptMachine = setup({
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
  id: "prompt",
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
