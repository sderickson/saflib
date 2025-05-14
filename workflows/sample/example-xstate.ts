import { setup } from "xstate";
import {
  logInfo,
  prompt,
  workflowActionImplementations,
  workflowActors,
} from "./xstate-shared.ts";

interface ExampleWorkflowInput {
  bar: string;
}

interface ExampleWorkflowContext {
  foo: string;
}

export const ExampleWorkflowMachine = setup({
  types: {
    input: {} as ExampleWorkflowInput,
    context: {} as ExampleWorkflowContext,
  },
  actors: workflowActors,
  actions: workflowActionImplementations,
}).createMachine({
  id: "example",
  description: "An example workflow",
  initial: "a",
  context: ({ input }) => {
    return {
      foo: input.bar,
    };
  },
  entry: [logInfo("Successfully began workflow")],
  states: {
    a: {
      on: {
        continue: { target: "b" },
      },
    },
    b: {
      on: {
        continue: {
          target: "c",
          actions: prompt(
            ({ context }) => `Successfully went to b: ${context.foo}`,
          ),
        },
      },
    },
    c: {
      on: {
        continue: { target: "done" },
      },
    },
    done: {
      type: "final",
    },
  },
});
