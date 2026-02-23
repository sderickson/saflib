import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
// BEGIN SORTED WORKFLOW AREA storeImports FOR service/add-store
import { createObjectStore } from "@saflib/object-store";
import type { ObjectStore } from "@saflib/object-store";
// END WORKFLOW AREA

export interface ServiceContext {
  dbKey: DbKey;
  // BEGIN SORTED WORKFLOW AREA storeProperties FOR service/add-store
  __storeName__: ObjectStore;
  // END WORKFLOW AREA
}

export const serviceStorage = new AsyncLocalStorage<ServiceContext>();

export interface ServiceContextOptions {
  dbKey?: DbKey;
  // BEGIN SORTED WORKFLOW AREA storeOptions FOR service/add-store
  __storeName__?: ObjectStore;
  // END WORKFLOW AREA
}

export const makeContext = (
  options: ServiceContextOptions = {},
): ServiceContext => {
  // BEGIN WORKFLOW AREA storeInit FOR service/add-store
  const __storeName__ =
    options.__storeName__ ?? createObjectStore({ type: "test" });
  // END WORKFLOW AREA
  return {
    dbKey: options.dbKey,
    // BEGIN SORTED WORKFLOW AREA storeReturn FOR service/add-store
    __storeName__,
    // END WORKFLOW AREA
  };
};
