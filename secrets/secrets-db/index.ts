export type * from "./types.ts";
export * from "./errors.ts";

import { secretsDbManager } from "./instances.ts";
// TODO: Import query modules as you create them
// import * as secretss from "./queries/secretss/index.ts";

export const secretsDb = {
  ...secretsDbManager.publicInterface(),
  // TODO: Add query modules as you create them
  // TODO: Remove todos once any queries are added
  // secretss,
};
