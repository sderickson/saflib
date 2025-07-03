import { createLogger } from "./logger.ts";
import type { SafReporters } from "./types.ts";
import { AsyncLocalStorage } from "async_hooks";

export const testReporters: SafReporters = {
  log: createLogger(),
  reportError: () => {},
};

export const safReportersStorage = new AsyncLocalStorage<SafReporters>();

export const getSafReporters = (): SafReporters => {
  const store = safReportersStorage.getStore();
  if (!store && process.env.NODE_ENV === "test") {
    return testReporters;
  }
  if (!store) {
    throw new Error("SafReporters not found");
  }
  return store;
};
