import type { AsyncLocalStorage } from "node:async_hooks";
import { AsyncLocalStorage as ALS } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type {
  JobOperationConfigMap,
  OperationMap,
  TriggerMap,
} from "./types.ts";

export interface JobsServiceContext {
  dbKey: DbKey;
  triggerMap: TriggerMap;
  operationConfig: JobOperationConfigMap;
  /** Resolved product operations (app spec), for background checks. */
  operations: OperationMap;
}

export const jobsServiceStorage: AsyncLocalStorage<JobsServiceContext> =
  new ALS();
