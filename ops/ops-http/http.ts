import express, { type Request } from "express";
import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import type { DbKey, DbOptions } from "@saflib/drizzle";
import { opsDb } from "@saflib/ops-db";
import { opsServiceStorage } from "./context.ts";
import { createOpsRoutes } from "./routes/index.ts";
import {
  createOpsTokenSecurityResolver,
  type OpsTokenResolverOptions,
} from "./auth/ops-token-resolver.ts";
import { processCheck } from "./health/builtin-checks.ts";
import { recordCurrentBoot } from "./boot.ts";
import type { BuildInfo } from "@saflib/node/git-hashes";
import type { HealthCheck } from "./health/types.ts";

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
}

/**
 * True for requests the ops API authenticates itself (`/ops/*`, by ops
 * token). Products pass this as `deferAuth` to `createProductHttpApp` so the
 * global session gate lets them through to the operation's own `security`.
 * Admin routes (`/admin/ops-tokens`, `/admin/logs`) are NOT deferred: they
 * use the session like any other admin route.
 */
export function isOpsApiRequest(req: Request): boolean {
  return req.path === "/ops" || req.path.startsWith("/ops/");
}

function isOpsPath(path: string): boolean {
  return (
    path === "/ops" ||
    path.startsWith("/ops/") ||
    path === "/admin/logs" ||
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
  const context = {
    dbKey,
    healthChecks: [processCheck(), ...(options.healthChecks ?? [])],
    logsDbKey: options.logsDbKey,
    issuesDbKey: options.issuesDbKey,
    // Each router creation is one process start in production.
    currentBoot: recordCurrentBoot(dbKey, options.buildInfo),
  };
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
