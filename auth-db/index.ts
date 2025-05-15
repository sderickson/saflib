export type * from "./types.ts";
import * as users from "./queries/users/index.ts";
// import * as jobSettings from "./queries/job-settings/index.ts";
// export * from "./errors.ts";

import { authDbManager } from "./instances.ts";

export const authDb = {
  ...authDbManager.publicInterface(),
  users,
  // jobSettings,
};
