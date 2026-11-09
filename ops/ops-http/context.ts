import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { OpsBoot } from "@saflib/ops-db";
import type { HealthCheck } from "./health/types.ts";
import type { OpsMetricsConfig } from "./metrics/prometheus.ts";

/** Per-router state for ops handlers. */
export interface OpsServiceContext {
  dbKey: DbKey;
  healthChecks: HealthCheck[];
  /** The persisted logs database, when the product enables it. */
  logsDbKey?: DbKey;
  /** The issues database, when the product enables it. */
  issuesDbKey?: DbKey;
  /** True when this process checks its dependencies (it has a lockfile). */
  dependencyChecks?: boolean;
  /** Where PromQL goes, when the product enables metrics. */
  metrics?: OpsMetricsConfig;
  /** This process's boot record, once written. */
  currentBoot: Promise<OpsBoot | undefined>;
}

export const opsServiceStorage = new AsyncLocalStorage<OpsServiceContext>();
