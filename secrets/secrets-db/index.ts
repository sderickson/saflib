export type * from "./types.ts";
export * from "./errors.ts";

import { secretsDbManager } from "./instances.ts";
import { secrets } from "./queries/secrets/index.ts";

export const secretsDb = {
  ...secretsDbManager.publicInterface(),
  secrets,
};
