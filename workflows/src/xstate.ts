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
} from "xstate";

// general types

interface ActionParam<C, E extends AnyEventObject> {
  context: C;
  event: E;
}

export interface WorkflowContext {
  loggedLast: boolean;
  systemPrompt?: string;
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

export interface LogParams {
  msg: string;
  level?: "info" | "error";
}

const log = <C, E extends AnyEventObject>(
  level: "info" | "error",
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

const logImpl: WorkflowActionFunction<any, AnyEventObject, LogParams> = assign(
  ({ context }: { context: WorkflowContext }, { msg, level = "info" }) => {
    const statusChar = level === "info" ? "✓" : "✗";
    print(`${statusChar} ${msg}`, context.loggedLast);
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

// used in workflow machines

export const workflowActionImplementations = {
  log: logImpl,
  prompt: promptImpl,
};

export const workflowActors = {
  noop: fromPromise(async (_) => {}),
};

// utils

const runCommandAsync = (command: string, args: string[]) => {
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
