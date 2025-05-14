import { assign, fromPromise, setup } from "xstate";

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
  actions: {
    log: assign(
      (
        _,
        { msg, level = "info" }: { msg: string; level?: "info" | "error" },
      ) => {
        const statusChar = level === "info" ? "✓" : "✗";
        console.log(`${statusChar} ${msg}`);
        return { foo: "!!!" };
      },
    ),
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
  entry: [
    // logInfo("Successfully began workflow"),
    {
      type: "log",
      params: (_) => ({
        msg: "Successfully began workflow",
        level: "info",
      }),
    },
  ],
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
