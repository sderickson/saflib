import { createLogger } from "./logger.ts";
import type { SafReporters, SubsystemName } from "./types.ts";
import { AsyncLocalStorage } from "async_hooks";
import { defaultErrorReporter, makeSubsystemErrorReporter } from "./errors.ts";
import { typedEnv } from "@saflib/env";
import { safContextStorage } from "./context.ts";

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

/**
 * Run `fn` in the current request context, but labelled with
 * `operationName`, with reporters (logger) bound to that name.
 *
 * For code that runs outside the operation's own context although the
 * operation is known by then: the app-wide error handler, and `finish`
 * listeners registered by global middleware. Both run in the request's
 * early context, created before the route matched, whose operation is a
 * placeholder ("unknown-operation"). No-op without a context or a name, or
 * when the context already has that name.
 */
export const runWithOperationName = <T>(
  operationName: string | undefined,
  fn: () => T,
): T => {
  const context = safContextStorage.getStore();
  if (!context || !operationName || context.operationName === operationName) {
    return fn();
  }
  const named = { ...context, operationName };
  const reporters: SafReporters = {
    log: createLogger(named),
    logError: safReportersStorage.getStore()?.logError ?? defaultErrorReporter,
  };
  return safContextStorage.run(named, () =>
    safReportersStorage.run(reporters, fn),
  );
};
