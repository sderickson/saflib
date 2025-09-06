import { print } from "../utils.ts";
import { assign, type AnyEventObject } from "xstate";
import {
  type ActionParam,
  type WorkflowContext,
  type WorkflowActionFunction,
} from "../types.ts";
import { getWorkflowLogger } from "../store.ts";

/**
 * Params for the log action.
 */
export interface LogParams {
  msg: string;
  level?: "info" | "error" | "warn" | "debug";
}

const log = <C, E extends AnyEventObject>(
  level: "info" | "error" | "warn" | "debug",
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

/**
 * Action builder for logging debug messages.
 */
export const logDebug = <C, E extends AnyEventObject>(
  cb: string | ((ctx: ActionParam<C, E>) => string),
) => {
  return log("debug", cb);
};

export const logImpl: WorkflowActionFunction<any, AnyEventObject, LogParams> =
  assign((_, { msg, level = "info" }) => {
    const logger = getWorkflowLogger();
    logger[level](msg);
    return { loggedLast: true };
  });
