import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { templatesDb } from "@saflib/templates-db/instances";
// BEGIN WORKFLOW AREA storeImports FOR service/add-store


// END WORKFLOW AREA

export interface TemplatesServiceContext {
  templatesDbKey: DbKey;
  // BEGIN WORKFLOW AREA storeProperties FOR service/add-store

  // END WORKFLOW AREA
}

export const templatesServiceStorage =
  new AsyncLocalStorage<TemplatesServiceContext>();

export interface TemplatesServiceContextOptions {
  templatesDbKey?: DbKey;
  // BEGIN WORKFLOW AREA storeOptions FOR service/add-store

  // END WORKFLOW AREA
}

export const makeContext = (
  options: TemplatesServiceContextOptions = {},
): TemplatesServiceContext => {
  const dbKey = options.templatesDbKey ?? templatesDb.connect();
  // BEGIN WORKFLOW AREA storeInit FOR service/add-store


  // END WORKFLOW AREA
  return {
    templatesDbKey: dbKey,
    // BEGIN WORKFLOW AREA storeReturn FOR service/add-store

    // END WORKFLOW AREA
  };
};
