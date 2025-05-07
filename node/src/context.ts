import { Auth } from "@saflib/express/src/middleware/auth.ts";
import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "winston";

export interface SafContext {
  requestId: string;
  log: Logger;
  auth?: Auth;
}
export const safContext = new AsyncLocalStorage<SafContext>();
