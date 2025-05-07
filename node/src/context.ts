import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "winston";

export interface Auth {
  userId: number;
  userEmail: string;
  scopes: string[];
}

export interface SafContext {
  requestId: string;
  log: Logger;
  auth?: Auth;
}
export const safContext = new AsyncLocalStorage<SafContext>();
