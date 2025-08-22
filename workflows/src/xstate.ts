import { getCurrentPackage, print } from "./utils.ts";
import { spawn, spawnSync } from "child_process";
import {
  assign,
  type AnyEventObject,
  type Values,
  type NonReducibleUnknown,
  type ActionFunction,
  type PromiseActorLogic,
  type MachineContext,
  fromPromise,
  raise,
} from "xstate";
import type { ChecklistItem } from "./types.ts";

// general types

interface ActionParam<C, E extends AnyEventObject> {
  context: C;
  event: E;
}

/**
 * Inputs every workflow machine receives.
 */
export interface WorkflowInput {
  /**
   * Flag to skip all execution of the workflow. Used mainly to get a checklist.
   */
  dryRun?: boolean;
}

/**
 * Outputs every workflow machine returns.
 */
export interface WorkflowOutput {
  /**
   * Short descriptions of every step taken in the workflow. Can be used
   * either to generate a sample checklist for a workflow, or a summary
   * of the work done by a completed workflow. Workflows build these recursively.
   */
  checklist: ChecklistItem[];
}

/**
 * Context shared across all workflow machines.
 */
export interface WorkflowContext {
  /**
   * Short descriptions of every step taken in the workflow. Can be used
   * either to generate a sample checklist for a workflow, or a summary
   * of the work done by a completed workflow. Workflows build these recursively.
   */
  checklist: ChecklistItem[];

  /**
   * Flag for if the last thing printed was a log message. This is just
   * to space logs and prompts out from each other.
   */
  loggedLast?: boolean;

  /**
   * Optional prompt to be printed above every step prompt. Use to remind the
   * agent what the workflow is for, especially if it's a long one.
   */
  systemPrompt?: string;

  /**
   * Flag to skip all execution of the workflow. Use to return before doing things
   * like file operations. This is necessary to get a checklist from a workflow
   * without actually operating it.
   */
  dryRun?: boolean;
}

type WorkflowActionFunction<
  C extends MachineContext,
  E extends AnyEventObject,
  Params,
> = ActionFunction<
  C,
  E,
  E,
  Params,
  {
    src: "noop";
    logic: PromiseActorLogic<unknown, NonReducibleUnknown, any>;
    id: string | undefined;
  },
  Values<any>,
  never,
  never,
  E
>;

// log action

/**
 * Params for the log action.
 */
export interface LogParams {
  msg: string;
  level?: "info" | "error" | "warn";
}

const log = <C, E extends AnyEventObject>(
  level: "info" | "error" | "warn",
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return {
    type: "log" as const,
    params: (event: ActionParam<C, E>) => ({
      msg: typeof cb === "function" ? cb(event) : cb,
      level,
    }),
  };
};

export const logInfo = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("info", cb);
};

export const logError = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("error", cb);
};

export const logWarn = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("warn", cb);
};

const logImpl: WorkflowActionFunction<any, AnyEventObject, LogParams> = assign(
  ({ context }: { context: WorkflowContext }, { msg, level = "info" }) => {
    const statusChar = level === "info" ? "✓" : level === "error" ? "✗" : "⚠";
    print(`${statusChar} ${msg}`, context.loggedLast ?? false);
    return { loggedLast: true };
  },
);

// prompt action

export const promptAgent = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return {
    type: "prompt" as const,
    params: (event: ActionParam<C, E>) => ({
      msg: typeof cb === "function" ? cb(event) : cb,
    }),
  };
};

interface PromptParams {
  msg: string;
}

const promptImpl: WorkflowActionFunction<any, AnyEventObject, PromptParams> =
  assign(({ context }: { context: WorkflowContext }, { msg }: PromptParams) => {
    if (context.systemPrompt) {
      print(context.systemPrompt);
    }
    print(msg);
    return { loggedLast: false };
  });

// test action

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

export const doesTestPass = (pathString: string) => {
  const { command, args } = getTestCommandAndArgs();
  return runCommandAsync(command, [...args, pathString]);
};

export const doTestsPass = () => {
  const { command, args } = getTestCommandAndArgs();
  return runCommandAsync(command, args);
};

export const doTestsPassSync = () => {
  const { command, args } = getTestCommandAndArgs();
  const { status } = spawnSync(command, args);
  return status === 0;
};

// generate action

export const generateMigrations = () => {
  return runCommandAsync("npm", ["run", "generate"]);
};

/**
 * Common actions for workflow machines.
 */
export const workflowActions = {
  log: logImpl,
  prompt: promptImpl,
};

/**
 * Common actors for workflow machines.
 */
export const workflowActors = {
  noop: fromPromise(async (_) => {}),
};

// utils

export const runCommandAsync = (command: string, args: string[]) => {
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

export function promptState<C extends WorkflowContext>(
  promptForContext: ({ context }: { context: C }) => string | string,
  target: string,
) {
  return {
    entry: raise({ type: "prompt" }),
    on: {
      prompt: {
        actions: [promptAgent(promptForContext)],
      },
      continue: {
        target,
      },
    },
  };
}

interface PromptAgentFactoryOptions<C extends WorkflowContext>
  extends ComposerFunctionOptions {
  promptForContext: ({ context }: { context: C }) => string | string;
}

export function promptAgentFactory<C extends WorkflowContext>({
  promptForContext,
  stateName,
  nextStateName,
}: PromptAgentFactoryOptions<C>) {
  return {
    [stateName]: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(promptForContext),
            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: promptForContext({
                      context: context as C,
                    }).split("\n")[0],
                  },
                ];
              },
            }),
          ],
        },
        continue: {
          target: nextStateName,
        },
      },
    },
  };
}

/**
 * Options for all composer functions. These functions return
 * an object which can be spread into an XState "states" object,
 * for easily composing a workflow machine from common steps.
 */
export interface ComposerFunctionOptions {
  stateName: string;
  nextStateName: string;
}
