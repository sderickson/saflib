export type * from "./types.ts";
import * as jobSettings from "./queries/job-settings/index.ts";
export * from "./errors.ts";

import { cronDbManager } from "./instances.ts";

export const cronDb = {
  ...cronDbManager.publicInterface(),
  jobSettings,
};
