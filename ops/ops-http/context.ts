import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { OpsBoot } from "@saflib/ops-db";
import type { HealthCheck } from "./health/types.ts";

/** Per-router state for ops handlers. */
export interface OpsServiceContext {
  dbKey: DbKey;
  healthChecks: HealthCheck[];
  /** The persisted logs database, when the product enables it. */
  logsDbKey?: DbKey;
  /** This process's boot record, once written. */
  currentBoot: Promise<OpsBoot | undefined>;
}

export const opsServiceStorage = new AsyncLocalStorage<OpsServiceContext>();
