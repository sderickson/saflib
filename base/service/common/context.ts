import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { baseDb } from "@saflib/base-db/instances";
// BEGIN WORKFLOW AREA storeImports FOR service/add-store


// END WORKFLOW AREA

export interface TemplatesServiceContext {
  baseDbKey: DbKey;
  // BEGIN WORKFLOW AREA storeProperties FOR service/add-store

  // END WORKFLOW AREA
}

export const baseServiceStorage =
  new AsyncLocalStorage<TemplatesServiceContext>();

export interface TemplatesServiceContextOptions {
  baseDbKey?: DbKey;
  // BEGIN WORKFLOW AREA storeOptions FOR service/add-store

  // END WORKFLOW AREA
}

export const makeContext = (
  options: TemplatesServiceContextOptions = {},
): TemplatesServiceContext => {
  const dbKey = options.baseDbKey ?? baseDb.connect();
  // BEGIN WORKFLOW AREA storeInit FOR service/add-store


  // END WORKFLOW AREA
  return {
    baseDbKey: dbKey,
    // BEGIN WORKFLOW AREA storeReturn FOR service/add-store

    // END WORKFLOW AREA
  };
};
