export type * from "./types.ts";
export * from "./queries/users/index.ts";
export * from "./queries/email-auth/index.ts";
export * from "./errors.ts";

import { identityDbManager } from "./instances.ts";

export const identityDb = identityDbManager.publicInterface();
