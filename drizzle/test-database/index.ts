export type * from "./types.ts";
export * from "./errors.ts";

import { mainDbManager } from "./instances.ts";
// Import query modules as you create them
import * as users from "./queries/users/index.ts";

export const mainDb = {
  ...mainDbManager.publicInterface(),
  // Add query modules as you create them
  users,
};
