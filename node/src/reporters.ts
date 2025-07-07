import { createLogger } from "./logger.ts";
import type { SafReporters } from "./types.ts";
import { AsyncLocalStorage } from "async_hooks";
import { makeSubsystemErrorReporter } from "./errors.ts";

export const safReportersStorage = new AsyncLocalStorage<SafReporters>();

export const getSafReporters = (): SafReporters => {
  const store = safReportersStorage.getStore();
  if (!store && process.env.NODE_ENV === "test") {
    const testReporters: SafReporters = {
      log: createLogger(),
      logError: () => {},
    };
    return testReporters;
  }
  if (!store) {
    throw new Error("SafReporters not found");
  }
  return store;
};

export const makeSubsystemReporters = (
  subsystemName: string,
  operationName: string,
): SafReporters => {
  const logger = createLogger({
    subsystemName,
    operationName,
    requestId: "none",
  });
  const logError = makeSubsystemErrorReporter(
    subsystemName,
    operationName,
    logger,
  );
  return {
    log: logger,
    logError,
  };
};
