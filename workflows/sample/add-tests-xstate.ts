import { fromPromise, assign, enqueueActions, setup } from "xstate";
import { existsSync } from "fs";
import { basename } from "path";
import { addNewLinesToString } from "../src/utils.ts";
import { exec } from "child_process";
const print = (msg: string, noNewLine = false) => {
  if (!noNewLine) {
    console.log("");
  }
  console.log(addNewLinesToString(msg));
};

const doTestsPass = async () => {
  const command = `npm run test`;
  let resolve: (value: string) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<string>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  await exec(command, (error, stdout) => {
    if (error) {
      reject(error);
    } else {
      resolve(stdout);
    }
  });
  return promise;
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
        print(`✓ ${msg}`, context.loggedLast);
        return { loggedLast: true };
      },
    ),
    printPrompt: assign(({ context }, { msg }: { msg: string }) => {
      print(`You are adding tests to ${context.basename}`);
      print(msg);
      return { loggedLast: false };
    }),
  },
}).createMachine({
  id: "add-tests",
  description: "Given a file, add tests to the file.",
  initial: "validatingTests",
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
    validatingTests: {
      entry: [
        {
          type: "log",
          params: () => ({ msg: "Successfully began workflow" }),
        },
        {
          type: "printPrompt",
          params: ({ context }) => ({
            msg: `First, run the existing tests for the package that ${context.basename} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
          }),
        },
      ],
      invoke: {
        src: fromPromise(async () => {
          const result = await doTestsPass();
          console.log("Tests passed");
          console.log(result);
        }),
      },
    },
  },
});
