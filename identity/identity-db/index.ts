export type * from "./types.ts";
export * from "./queries/users/index.ts";
export * from "./queries/email-auth/index.ts";
export * from "./errors.ts";

import { identityDbManager } from "./instances.ts";

/**
 * For managing connections to the identity database.
 */
export const identityDb = identityDbManager.publicInterface();
