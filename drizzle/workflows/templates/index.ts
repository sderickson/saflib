export type * from "./types.ts";
export * from "./errors.ts";

import { __serviceName__DbManager } from "./instances.ts";
export const __serviceName__Db = __serviceName__DbManager.publicInterface();

// TODO: Import query modules as you create them, e.g.:
// export * from "./queries/example/index.ts";
