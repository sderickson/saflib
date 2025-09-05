import { print } from "./utils.ts";
import { spawn, spawnSync } from "child_process";
import {
  assign,
  type AnyEventObject,
  fromPromise,
} from "xstate";
import { getCurrentPackage } from "@saflib/dev-tools";
import { type ActionParam, type WorkflowContext, type WorkflowActionFunction } from "./types.ts";


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

/**
 * Action builder for logging info messages.
 */
export const logInfo = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("info", cb);
};

/**
 * Action builder for logging error messages.
 */
export const logError = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("error", cb);
};

/**
 * Action builder for logging warning messages.
 */
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

/**
 * Action builder for prompting the agent.
 */
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

/**
 * @deprecated - to be replaced with generateMigrationsComposer
 */
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
 *
 * Currently none are intended for use. Types fail if I don't include
 * at least one actor. Probably should figure out how to better type this.
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
  const child = spawn(command, args, { stdio: "inherit" });
  child.on("close", (code) => {
    if (code === 0) {
      resolve("Tests passed");
    } else {
      reject(new Error("Tests failed"));
    }
  });
  return promise;
};
