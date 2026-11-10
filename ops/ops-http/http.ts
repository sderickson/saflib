import express, { type Request } from "express";
import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import type { DbKey, DbOptions } from "@saflib/drizzle";
import { opsDb } from "@saflib/ops-db";
import { opsServiceStorage, type OpsServiceContext } from "./context.ts";
import { createOpsRoutes } from "./routes/index.ts";
import {
  createOpsTokenSecurityResolver,
  type OpsTokenResolverOptions,
} from "./auth/ops-token-resolver.ts";
import { processCheck } from "./health/builtin-checks.ts";
import { recordCurrentBoot } from "./boot.ts";
import { registerHealthCheckMetric } from "./health/health-metric.ts";
import { readManifest } from "./dependencies/manifest.ts";
import { startDependencyChecks } from "./dependencies/scheduler.ts";
import { hostOsFromPrometheus } from "./dependencies/host-os.ts";
import { SAFLIB_ACCEPTED_ADVISORIES, type AcceptedAdvisory } from "./dependencies/accepted.ts";
import { registerDependencyMetrics } from "./dependencies/metrics.ts";
import type { BuildInfo, ReleaseInfo } from "@saflib/node/git-hashes";
import type { HealthCheck } from "./health/types.ts";
import type { OpsMetricsConfig } from "./metrics/prometheus.ts";

export interface OpsRouterOptions {
  /** Connection to the ops database; connects with `dbOptions` when omitted. */
  dbKey?: DbKey;
  dbOptions?: DbOptions;
  /**
   * Health checks for `GET /ops/health`. A `process` check is always added;
   * products typically add `diskCheck` for their data volume and probes for
   * their databases.
   */
  healthChecks?: HealthCheck[];
  /** Rate limit settings for ops-token requests. */
  rateLimits?: OpsTokenResolverOptions;
  /**
   * The persisted logs database (`@saflib/node-log-db`). When omitted, the
   * log endpoints respond 404.
   */
  logsDbKey?: DbKey;
  /**
   * The issues database (`@saflib/errors-db`). When omitted, the issue
   * endpoints respond 404.
   */
  issuesDbKey?: DbKey;
  /** Build metadata override (tests); defaults to the image's `/etc/saf/build.json`. */
  buildInfo?: BuildInfo;
  /**
   * Metrics query proxy (`/ops/metrics/*`). Requires the host's
   * prom-label-proxy; when omitted, the metrics endpoints respond 404.
   */
  metrics?: OpsMetricsConfig;
  /**
   * Daily dependency checks (OSV advisories, npm latest) of the image's
   * lockfile. On by default when a lockfile exists at
   * `SAF_LOCKFILE`/`/app/package-lock.json` (built images); `false` turns
   * them off. Tests pass a manifest and drive `runDependencyCheckOnce`.
   *
   * `acceptedAdvisories` lists advisories the product lives with for now
   * (no upstream fix, unused code path): still reported, never actionable.
   * Give each a reason and, ideally, an `until` date to look again. They add
   * to `SAFLIB_ACCEPTED_ADVISORIES` (for packages saflib brings in).
   */
  dependencies?: false | { lockfilePath?: string; acceptedAdvisories?: AcceptedAdvisory[] };
  /** Release stamp override (tests); defaults to `/etc/saf/release/release.json`. */
  releaseInfo?: ReleaseInfo;
}

/**
 * True for requests the ops API authenticates itself (`/ops/*`, by ops
 * token). Products pass this as `deferAuth` to `createProductHttpApp` so the
 * global session gate lets them through to the operation's own `security`.
 * Session requests to `/ops/*` (site admins, from the admin SPA) are
 * deferred too and checked by the operation's session alternative. Token
 * admin (`/admin/ops-tokens`) is NOT deferred: session only.
 */
export function isOpsApiRequest(req: Request): boolean {
  return req.path === "/ops" || req.path.startsWith("/ops/");
}

function isOpsPath(path: string): boolean {
  return (
    path === "/ops" ||
    path.startsWith("/ops/") ||
    path === "/admin/ops-tokens" ||
    path.startsWith("/admin/ops-tokens/")
  );
}

/**
 * Router for the ops API and ops token admin. Only handles its own paths;
 * everything else falls through to sibling routers.
 */
export function createOpsRouter(options: OpsRouterOptions = {}) {
  const dbKey = options.dbKey ?? opsDb.connect(options.dbOptions);
  const context: OpsServiceContext = {
    dbKey,
    healthChecks: [processCheck(), ...(options.healthChecks ?? [])],
    logsDbKey: options.logsDbKey,
    issuesDbKey: options.issuesDbKey,
    metrics: options.metrics,
    // Each router creation is one process start in production.
    currentBoot: recordCurrentBoot(dbKey, options.buildInfo, options.releaseInfo),
    acceptedAdvisories: [
      ...SAFLIB_ACCEPTED_ADVISORIES,
      ...(options.dependencies ? (options.dependencies.acceptedAdvisories ?? []) : []),
    ],
  };
  registerHealthCheckMetric(context.healthChecks);
  const manifest =
    options.dependencies === false || process.env.NODE_ENV === "test"
      ? undefined
      : readManifest(options.dependencies?.lockfilePath);
  if (manifest) {
    const metricsConfig = options.metrics;
    startDependencyChecks({
      dbKey,
      manifest,
      // The server's OS gets the same end-of-life check as the image's.
      hostOs: metricsConfig ? () => hostOsFromPrometheus(metricsConfig) : undefined,
    });
    context.dependencyChecks = true;
    registerDependencyMetrics(dbKey, context.acceptedAdvisories ?? []);
  }
  const resolver = createOpsTokenSecurityResolver(() => dbKey, options.rateLimits);

  const inner = express.Router();
  inner.use((_req, _res, next) => {
    opsServiceStorage.run(context, () => next());
  });
  inner.use(createOpsRoutes(resolver));
  inner.use(createErrorMiddleware());

  const router = express.Router();
  router.use((req, res, next) => {
    if (!isOpsPath(req.path)) {
      next();
      return;
    }
    inner(req, res, next);
  });
  return router;
}

/** Standalone app (tests, or running the ops API on its own). */
export function createApp(options: OpsRouterOptions = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(createGlobalMiddleware());
  app.use(createOpsRouter(options));
  return app;
}
