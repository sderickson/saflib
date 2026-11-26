import { AsyncLocalStorage } from "node:async_hooks";
import type { DbKey } from "@saflib/drizzle";
import type { OpsBoot } from "@saflib/ops-db";
import type { HealthCheck } from "./health/types.ts";
import type { OpsMetricsConfig } from "./metrics/prometheus.ts";
import type { DigestTileProvider } from "./digest/tiles.ts";
import type { DiagnosticProbe, RunRegistry } from "./diagnostics/probes.ts";
import type { OpsAuditSource } from "./audit/source.ts";
import type { AcceptedAdvisory } from "./dependencies/accepted.ts";

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
  /** Advisories the product accepted (see `OpsRouterOptions.dependencies`). */
  acceptedAdvisories?: AcceptedAdvisory[];
  /** Where PromQL goes, when the product enables metrics. */
  metrics?: OpsMetricsConfig;
  /** The audit log, when the product has one (`GET /ops/audit`). */
  audit?: OpsAuditSource;
  /** Product tiles for the admin Overview (see `OpsRouterOptions.digestTiles`). */
  digestTiles?: DigestTileProvider[];
  /** Observability self-test probes and what each run triggered. */
  diagnostics?: { probes: DiagnosticProbe[]; registry: RunRegistry };
  /** This process's boot record, once written. */
  currentBoot: Promise<OpsBoot | undefined>;
}

export const opsServiceStorage = new AsyncLocalStorage<OpsServiceContext>();
