export type * from "./types.ts";
export * from "./errors.ts";
export * from "./queries/secrets/index.ts";

import { secretsDbManager } from "./instances.ts";

export const secretsDb = {
  ...secretsDbManager.publicInterface(),
};
