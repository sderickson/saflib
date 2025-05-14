import { fromPromise, setup } from "xstate";

interface ExampleWorkflowContext {
  foo: string;
}

export const ExampleWorkflowMachine = setup({
  types: {
    input: {} as {
      foo: string;
    },
    context: {} as ExampleWorkflowContext,
  },
  actors: {
    noop: fromPromise(async (_) => {}),
  },
}).createMachine({
  id: "add-tests",
  description: "Given a file, add tests to the file.",
  initial: "a",
  context: ({ input }) => {
    return {
      foo: input.foo,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    a: {
      on: {
        continue: { target: "b" },
      },
    },
    b: {
      on: {
        continue: { target: "c" },
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
