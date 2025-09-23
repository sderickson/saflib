export type * from "./types.ts";
export * from "./errors.ts";

import { exampleDbManager } from "./instances.ts";
export const exampleDb = exampleDbManager.publicInterface();

// TODO: Import query modules as you create them, e.g.:
// export * from "./queries/example/index.ts";
