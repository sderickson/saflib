export type * from "./types.ts";
export * from "./errors.ts";

import { secretsDbManager } from "./instances.ts";

export const secretsDb = {
  ...secretsDbManager.publicInterface(),
};
