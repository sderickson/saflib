import { createLogger } from "./logger.ts";
import type { SafReporters, SubsystemName } from "./types.ts";
import { AsyncLocalStorage } from "async_hooks";
import { defaultErrorReporter, makeSubsystemErrorReporter } from "./errors.ts";
import { typedEnv } from "@saflib/env";

/**
 * AsyncLocalStorage for SafReporters.
 */
export const safReportersStorage = new AsyncLocalStorage<SafReporters>();

const defaultReporters: SafReporters = {
  log: createLogger(),
  logError: defaultErrorReporter,
};

/**
 * Convenience method for getting the SafReporters from the storage. Errors if not found.
 */
export const getSafReporters = (): SafReporters => {
  const store = safReportersStorage.getStore();
  if (!store || typedEnv.NODE_ENV === "test") {
    return defaultReporters;
  }
  return store;
};

/**
 * Creates a new SafReporters object for a given subsystem and operation.
 */
export const makeSubsystemReporters = (
  subsystemName: SubsystemName,
  operationName: string,
): SafReporters => {
  if (typedEnv.NODE_ENV === "test") {
    return defaultReporters;
  }

  const logger = createLogger({
    subsystemName,
    operationName,
  });
  const logError = makeSubsystemErrorReporter(subsystemName, operationName);
  return {
    log: logger,
    logError,
  };
};
