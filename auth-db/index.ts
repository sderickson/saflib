export type * from "./types.ts";
import * as users from "./queries/users/index.ts";
import * as emailAuth from "./queries/email-auth/index.ts";
export * from "./errors.ts";
import * as permissions from "./queries/permissions/index.ts";

import { authDbManager } from "./instances.ts";

export const authDb = {
  ...authDbManager.publicInterface(),
  users,
  emailAuth,
  permissions,
};
