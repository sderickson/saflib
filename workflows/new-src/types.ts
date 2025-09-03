import {
  assign,
  raise,
  setup,
  type AnyStateMachine,
  type InputFrom,
  type AnyActor,
  fromPromise,
  sendTo,
  type AnyActorRef,
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
 * A step in a workflow with an actor and its corresponding input.
 */
type Step<C, M extends AnyStateMachine> = {
  machine: M;
  input: InputFrom<M> | ((context: C) => InputFrom<M>);
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

/**
 * A checklist item, generated while going through the workflow after each step
 * completes.
 */
export interface ChecklistItem {
  description: string;
  subitems?: ChecklistItem[];
}

/**
 * Input *specifically* for the prompt step machine. Extends WorkflowInput because each workflow needs to accept it so that other workflow machines can invoke them.
 */
interface PromptMachineInput extends WorkflowInput {
  promptText: string;
}

/**
 * Context *specifically* for the prompt step machine. Extends WorkflowContext because each workflow needs to accept it so that other workflow machines can invoke them.
 */
interface PromptMachineContext extends WorkflowContext {
  promptText: string;
}

/**
 * A machine for a step in a workflow, where an LLM is prompted to do something.
 */
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
    sleep: fromPromise(async (_: any) => {
      console.log("sleeping...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("done sleeping");
      return true;
    }),
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input, self }) => ({
    checklist: [],
    loggedLast: false,
    systemPrompt: "",
    dryRun: input.dryRun,
    promptText: input.promptText,
    rootRef: input.rootRef || self,
  }),
  initial: "sleep",
  entry: raise({ type: "prompt" }),
  states: {
    sleep: {
      invoke: {
        src: "sleep",
        onDone: {
          target: "running",
        },
      },
    },
    running: {
      on: {
        prompt: {
          actions: [
            promptAgent(({ context }) => context.promptText),
            sendTo(({ context }) => context.rootRef, { type: "halt" }),
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
            // raise({ type: "continue" }),
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

interface JustPromptContext {
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

type JustPromptInput = CreateArgsType<typeof input>;

export function makeMachineFromWorkflow<I, C>(workflow: Workflow<C>) {
  type Input = I & WorkflowInput;
  type Context = C & WorkflowContext;

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
        input: ({ self, context }: { self: AnyActor; context: Context }) => {
          return {
            ...step.input,
            rootRef: context.rootRef || self,
          };
        },
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
      input: {} as Input,
      context: {} as Context,
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
    context: ({ self, input }) => {
      const context: Context = {
        ...workflow.context(),
        rootRef: input.rootRef || self,
        checklist: [],
        loggedLast: input.loggedLast,
        systemPrompt: input.systemPrompt,
      };
      return context;
    },
    initial: "step_0",
    states,
    output: ({ context }) => outputFromContext({ context }),
  });
}

export const pm = makeMachineFromWorkflow<JustPromptInput, JustPromptContext>(
  justPromptWorkflow,
);
