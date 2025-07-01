import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "winston";
import { createLogger } from "./logger.ts";

export interface Auth {
  userId: number;
  userEmail: string;
  userEmailVerified: boolean;
  userScopes: string[];
}

export interface SafContext {
  requestId: string;
  log: Logger;
  auth?: Auth;
}

export interface SafContextWithAuth extends SafContext {
  auth: Auth;
}

const testContext: SafContext = {
  requestId: "no-request-id",
  log: createLogger("no-request-id"),
};

export const safStorage = new AsyncLocalStorage<SafContext>();

export const getSafContext = () => {
  const store = safStorage.getStore();
  if (!store && process.env.NODE_ENV === "test") {
    return testContext;
  }
  if (!store) {
    throw new Error("SafContext not found");
  }
  return store;
};

export const getSafContextWithAuth = (): SafContextWithAuth => {
  const store = safStorage.getStore();
  if (!store) {
    throw new Error("SafContext not found");
  }
  if (!store.auth) {
    throw new Error("Auth not found");
  }
  return store as SafContextWithAuth;
};
