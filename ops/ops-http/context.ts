import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { HealthCheck } from "./health/types.ts";

/** Per-router state for ops handlers. */
export interface OpsServiceContext {
  dbKey: DbKey;
  healthChecks: HealthCheck[];
}

export const opsServiceStorage = new AsyncLocalStorage<OpsServiceContext>();
