import { fromPromise } from "xstate";
import { logImpl } from "./xstate-actions/log.ts";

/**
 * Common actions for workflow machines.
 */
export const workflowActions = {
  log: logImpl,
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

export { logInfo, logError, logWarn } from "./xstate-actions/log.ts";
export { doesTestPass } from "./xstate-actions/test.ts";
export { runCommandAsync } from "./xstate-actions/utils.ts";
