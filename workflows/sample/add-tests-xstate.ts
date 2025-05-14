import { assign, enqueueActions, setup } from "xstate";
import { existsSync } from "fs";
import { basename } from "path";
import { addNewLinesToString } from "../src/utils.ts";
const print = (msg: string, noNewLine = false) => {
  if (!noNewLine) {
    console.log("");
  }
  console.log(addNewLinesToString(msg));
};

export const AddTestsWorkflow = setup({
  types: {
    input: {} as {
      path: string;
    },
    context: {} as {
      path: string;
      basename: string;
      loggedLast: boolean;
    },
  },
  actions: {
    log: assign(
      ({ context }, { msg }: { msg: string; level?: "info" | "error" }) => {
        // print(`✓ ${msg}`, context.loggedLast);
        console.log("Got log?");
        return { loggedLast: true };
      },
    ),
    printPrompt: assign(({ context }, { msg }: { msg: string }) => {
      // print(`You are adding tests to ${context.basename}`);
      // print(msg);
      console.log("Got printPrompt?");
      return { loggedLast: false };
    }),
  },
}).createMachine({
  id: "add-tests",
  description: "Given a file, add tests to the file.",
  initial: "started",
  context: ({ input }) => {
    if (!existsSync(input.path)) {
      throw new Error(`File does not exist: ${input.path}`);
    }
    return {
      path: input.path,
      basename: basename(input.path),
      loggedLast: false,
    };
  },
  states: {
    started: {
      entry: enqueueActions(({ enqueue }) => {
        enqueue({
          type: "log",
          params: () => ({ msg: "Successfully kicked off" }),
        });
        enqueue({
          type: "log",
          params: () => ({ msg: "Did some other stuff" }),
        });
        enqueue({
          type: "printPrompt",
          params: ({ context }) => ({
            msg: `First, run the existing tests for the package that ${context.basename} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
          }),
        });
        enqueue({
          type: "log",
          params: () => ({ msg: "Did some other stuff" }),
        });
      }),
    },
  },
});
