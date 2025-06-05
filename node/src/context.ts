import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "winston";

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

export const safStorage = new AsyncLocalStorage<SafContext>();

export const getSafContext = () => {
  const store = safStorage.getStore();
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
