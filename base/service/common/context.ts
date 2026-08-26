import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { baseDb } from "@saflib/base-db/instances";
import { auditDb } from "@saflib/audit-db/instances";
// BEGIN WORKFLOW AREA storeImports FOR service/add-store
import { createObjectStore } from "@saflib/object-store";
import type { ObjectStore } from "@saflib/object-store";
// END WORKFLOW AREA

export interface BaseServiceContext {
  baseDbKey: DbKey;
  auditDbKey: DbKey;
  // BEGIN WORKFLOW AREA storeProperties FOR service/add-store
  __storeName__: ObjectStore;
  // END WORKFLOW AREA
}

export const baseServiceStorage =
  new AsyncLocalStorage<BaseServiceContext>();

export interface BaseServiceContextOptions {
  baseDbKey?: DbKey;
  auditDbKey?: DbKey;
  // BEGIN WORKFLOW AREA storeOptions FOR service/add-store
  __storeName__?: ObjectStore;
  // END WORKFLOW AREA
}

export const makeContext = (
  options: BaseServiceContextOptions = {},
): BaseServiceContext => {
  const dbKey = options.baseDbKey ?? baseDb.connect();
  const auditDbKey = options.auditDbKey ?? auditDb.connect();
  // BEGIN WORKFLOW AREA storeInit FOR service/add-store
  const __storeName__ =
    options.__storeName__ ?? createObjectStore({ type: "test" });
  // END WORKFLOW AREA
  return {
    baseDbKey: dbKey,
    auditDbKey,
    // BEGIN WORKFLOW AREA storeReturn FOR service/add-store
    __storeName__,
    // END WORKFLOW AREA
  };
};
