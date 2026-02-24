import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { __serviceName__Db } from "template-package-db";
// BEGIN SORTED WORKFLOW AREA storeImports FOR service/add-store
import { createObjectStore } from "@saflib/object-store";
import type { ObjectStore } from "@saflib/object-store";
// END WORKFLOW AREA

export interface __ServiceName__ServiceContext {
  __serviceName__DbKey: DbKey;
  // BEGIN SORTED WORKFLOW AREA storeProperties FOR service/add-store
  __storeName__: ObjectStore;
  // END WORKFLOW AREA
}

export const __serviceName__ServiceStorage =
  new AsyncLocalStorage<__ServiceName__ServiceContext>();

export interface __ServiceName__ServiceContextOptions {
  __serviceName__DbKey?: DbKey;
  // BEGIN SORTED WORKFLOW AREA storeOptions FOR service/add-store
  __storeName__?: ObjectStore;
  // END WORKFLOW AREA
}

export const makeContext = (
  options: __ServiceName__ServiceContextOptions = {},
): __ServiceName__ServiceContext => {
  const dbKey = options.__serviceName__DbKey ?? __serviceName__Db.connect();
  // BEGIN WORKFLOW AREA storeInit FOR service/add-store
  const __storeName__ =
    options.__storeName__ ?? createObjectStore({ type: "test" });
  // END WORKFLOW AREA
  return {
    __serviceName__DbKey: dbKey,
    // BEGIN SORTED WORKFLOW AREA storeReturn FOR service/add-store
    __storeName__,
    // END WORKFLOW AREA
  };
};
