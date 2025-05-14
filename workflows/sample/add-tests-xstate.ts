import {
  fromPromise,
  assign,
  setup,
  raise,
  AnyEventObject,
  // ActorRefFrom,
  // SnapshotFrom,
  // EventFromLogic,
  Values,
  NonReducibleUnknown,
  ActionFunction,
  PromiseActorLogic,
} from "xstate";
import { existsSync } from "fs";
import { basename } from "path";
import {
  print,
  doTestsPass,
  doTestsPassSync,
  logInfo,
  logError,
  prompt,
} from "./xstate-shared.ts";
import type { LogParams } from "./xstate-shared.ts";

interface AddTestsWorkflowContext {
  path: string;
  basename: string;
  loggedLast: boolean;
}

type AddTestsWorkflowActionFunction<Params extends {}> = ActionFunction<
  AddTestsWorkflowContext,
  AnyEventObject,
  AnyEventObject,
  Params,
  {
    src: "noop";
    logic: PromiseActorLogic<unknown, NonReducibleUnknown, any>;
    id: string | undefined;
  },
  Values<any>,
  never,
  never,
  AnyEventObject
>;

const logImpl: AddTestsWorkflowActionFunction<LogParams> = assign(
  ({ context }, { msg, level = "info" }) => {
    const statusChar = level === "info" ? "✓" : "✗";
    print(`${statusChar} ${msg}`, context.loggedLast);
    return { loggedLast: true };
  },
);

interface PromptParams {
  msg: string;
}

const promptImpl: AddTestsWorkflowActionFunction<PromptParams> = assign(
  ({ context }, { msg }: PromptParams) => {
    print(`You are adding tests to ${context.basename}`);
    print(msg);
    return { loggedLast: false };
  },
);

const actions = {
  log: logImpl,
  prompt: promptImpl,
};

const AddTestsWorkflowSetup = setup({
  types: {
    input: {} as {
      path: string;
    },
    context: {} as AddTestsWorkflowContext,
  },
  actions,
  actors: {
    noop: fromPromise(async (_) => {}),
  },
});

// type AddTestsWorkflowMachine = ReturnType<
//   typeof AddTestsWorkflowSetup.createMachine
// >;
// type AddTestsWorkflowActorRef = ActorRefFrom<AddTestsWorkflowMachine>;
// type AddTestsWorkflowSnapshotFrom = SnapshotFrom<AddTestsWorkflowMachine>;
// type AddTestsWorkflowEventFromLogic = EventFromLogic<AddTestsWorkflowMachine>;

export const AddTestsWorkflow = AddTestsWorkflowSetup.createMachine({
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
  entry: logInfo("Successfully began workflow"),
  states: {
    validatingTests: {
      on: {
        continue: { reenter: true },
        prompt: {
          actions: prompt(
            ({ context }) =>
              `First, run the existing tests for the package that ${context.basename} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
          ),
        },
      },
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "addingTests",
          actions: logInfo(
            ({ context: c }) => `Tests passed for ${c.basename}.`,
          ),
        },
        onError: {
          actions: [
            logError(({ context: c }) => `Tests failed for ${c.basename}.`),
            raise({ type: "prompt" }),
          ],
        },
      },
    },
    addingTests: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: prompt(
            ({ context }) =>
              `Add tests to ${context.basename}. Create the test file next to the file you are testing.`,
          ),
        },
        continue: [
          {
            guard: () => !doTestsPassSync(),
            actions: [
              logError(({ context: c }) => `Tests failed for ${c.basename}.`),
              raise({ type: "prompt" }),
            ],
          },
          {
            actions: logInfo(
              ({ context: c }) => `Tests passed for ${c.basename}.`,
            ),
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
