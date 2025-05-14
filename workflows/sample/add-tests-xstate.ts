import { fromPromise, assign, setup, raise, AnyEventObject } from "xstate";
import { existsSync, readFileSync } from "fs";
import { basename, join } from "path";
import { addNewLinesToString } from "../src/utils.ts";
import { spawn, spawnSync } from "child_process";

const print = (msg: string, noNewLine = false) => {
  if (!noNewLine) {
    console.log("");
  }
  console.log(addNewLinesToString(msg));
};

const getCurrentPackage = () => {
  const currentPackage = readFileSync(
    join(process.cwd(), "package.json"),
    "utf8",
  );
  return JSON.parse(currentPackage).name;
};

const getTestCommandAndArgs = () => {
  let command = "npm";
  let args = ["test"];

  // prevent infinite loop
  if (getCurrentPackage() === "@saflib/workflows") {
    command = "ls";
    args = [];
  }
  return { command, args };
};

const doTestsPass = async () => {
  const { command, args } = getTestCommandAndArgs();
  let resolve: (value: string) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<string>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  const child = spawn(command, args);
  child.on("close", (code) => {
    if (code === 0) {
      resolve("Tests passed");
    } else {
      reject(new Error("Tests failed"));
    }
  });
  return promise;
};

const doTestsPassSync = () => {
  const { command, args } = getTestCommandAndArgs();
  const { status } = spawnSync(command, args);
  return status === 0;
};

interface AddTestsWorkflowContext {
  path: string;
  basename: string;
  loggedLast: boolean;
}

const logInfo = (cb: string | ((ctx: ActionParam) => string)) => {
  return {
    type: "log" as const,
    params: (event: ActionParam) => ({
      msg: typeof cb === "function" ? cb(event) : cb,
    }),
  };
};

interface ActionParam {
  context: AddTestsWorkflowContext;
  event: AnyEventObject;
}

export const AddTestsWorkflow = setup({
  types: {
    input: {} as {
      path: string;
    },
    context: {} as AddTestsWorkflowContext,
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
  actors: {
    noop: fromPromise(async (_) => {}),
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
      on: {
        continue: {
          target: "validatingTests",
          reenter: true,
        },
        prompt: {
          actions: [
            {
              type: "printPrompt",
              params: (event) => ({
                msg: `First, run the existing tests for the package that ${event.context.basename} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
              }),
            },
          ],
        },
      },
      entry: [logInfo("Successfully began workflow")],
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "addingTests",
          actions: [
            logInfo(({ context }) => `Tests passed for ${context.basename}.`),
          ],
        },
        onError: {
          actions: [
            logInfo(({ context }) => `Tests failed for ${context.basename}.`),
            raise({ type: "prompt" }),
          ],
        },
      },
    },
    addingTests: {
      entry: [
        {
          type: "printPrompt",
          params: ({ context }) => ({
            msg: `Add tests to ${context.basename}. Create the test file next to the file you are testing.`,
          }),
        },
      ],
      on: {
        continue: [
          {
            guard: () => !doTestsPassSync(),
            actions: [
              {
                type: "log",
                params: ({ context }) => ({
                  msg: `Tests failed for ${context.basename}.`,
                  level: "error",
                }),
              },
            ],
            target: "addingTests",
          },
          {
            actions: [
              {
                type: "log",
                params: ({ context }) => ({
                  msg: `Tests passed for ${context.basename}.`,
                }),
              },
            ],
            target: "done",
          },
        ],
      },
    },
    done: {
      type: "final",
    },
  },
});
