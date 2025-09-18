export type * from "./types.ts";
export * from "./errors.ts";
export * from "./queries/secrets/index.ts";
export * from "./queries/service-tokens/index.ts";

import { secretsDbManager } from "./instances.ts";

export const secretsDb = {
  ...secretsDbManager.publicInterface(),
};
