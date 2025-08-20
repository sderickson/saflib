export type * from "./types.ts";
import { usersDb } from "./queries/users/index.ts";
import { emailAuthDb } from "./queries/email-auth/index.ts";
export * from "./errors.ts";

import { identityDbManager } from "./instances.ts";

export const identityDb = identityDbManager.publicInterface();
export { usersDb, emailAuthDb };
