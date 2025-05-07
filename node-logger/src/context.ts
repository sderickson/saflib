import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "winston";

export interface SafContext {
  requestId: string;
  logger: Logger;
}
export const safContext = new AsyncLocalStorage<SafContext>();
