import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAuthMiddleware,
  makeContextMiddleware,
} from "@saflib/express";
import { isDevelopmentDeployment } from "@saflib/env";
import express, { type Router } from "express";
import type { Request } from "express";
import type { DbKey } from "@saflib/drizzle";
import { createEmailsRouter } from "@saflib/email-service";
import { resolveEmailServiceFromEnv } from "@saflib/vendors-brevo";
import { baseDb } from "@saflib/base-db/instances";
import {
  baseAuditRecorderMiddleware,
  createBaseAuditRouter,
} from "@saflib/base-audit";
import {
  baseServiceStorage,
  type BaseServiceContextOptions,
  makeContext,
} from "@saflib/base-service-common/context";
import { createCronRouter } from "@saflib/cron";
import { baseJobs, getBaseCronDbKey } from "@saflib/base-cron";
import { createJobsRouter } from "@saflib/jobs";
import { getBaseJobsDbKey } from "@saflib/base-jobs";
import { createMetricsRouter } from "@saflib/node-metrics-http";
import { isPublicMonolithRoute as defaultIsPublicMonolithRoute } from "./is-public-monolith-route.ts";

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateBaseHttpAppShellOptions = BaseServiceContextOptions & {
  /**
   * Product / offshoot routers. Production wiring supplies these via
   * {@link ./http.ts}; slim route tests pass one group router.
   */
  mounts: HttpRouterMount[];
  /**
   * Public / no-auth gate. Defaults to {@link isPublicMonolithRoute}.
   * Keep in sync with Caddy `@public_monolith`.
   */
  isPublicMonolithRoute?: (req: Request) => boolean;
};

export type BaseHttpAppLease = {
  app: express.Express;
  baseDbKey: DbKey;
};

/**
 * Express shell for the base HTTP service: middleware order, ALS context,
 * auth gate, audit, platform terminators (jobs/cron), and error handling.
 *
 * Product wiring (default mounts + offshoots) lives in {@link ./http.ts}
 * as {@link createBaseHttpApp}.
 */
export function buildBaseHttpApp(
  options: CreateBaseHttpAppShellOptions,
): BaseHttpAppLease {
  let dbKey = options.baseDbKey;
  if (!dbKey) {
    dbKey = baseDb.connect();
  }

  const app = express();
  app.use(
    createGlobalMiddleware({
      disableCors: true,
    }),
  );
  app.set("trust proxy", 1);

  const context = makeContext({
    baseDbKey: dbKey,
    ...(options.auditDbKey !== undefined
      ? { auditDbKey: options.auditDbKey }
      : {}),
  });
  app.use((_req, _res, next) => {
    baseServiceStorage.run(context, () => {
      next();
    });
  });

  // Mock email inspection (GET /email/sent) — development only; before auth gate.
  if (isDevelopmentDeployment()) {
    app.use(
      createEmailsRouter({ emailService: resolveEmailServiceFromEnv() }),
    );
  }

  // Resolve identity into SafContext before the global auth gate / route handlers.
  app.use(makeContextMiddleware());

  const isPublicRoute =
    options.isPublicMonolithRoute ?? defaultIsPublicMonolithRoute;
  const globalAuthMiddleware = makeAuthMiddleware();
  app.use((req, res, next) => {
    // Public / no-auth routes skip the early gate so OpenAPI tags on the
    // operation scoped chain can authorize; keep in sync with Caddy
    // `@public_monolith` and {@link isPublicMonolithRoute}.
    if (isPublicRoute(req)) {
      next();
      return;
    }
    globalAuthMiddleware(req, res, next);
  });

  app.use(baseAuditRecorderMiddleware());

  if (isDevelopmentDeployment()) {
    app.use(createMetricsRouter());
  }

  for (const mount of options.mounts) {
    app.use(mount.createRouter());
  }

  // Platform terminators after product mounts (cron ends with catch-all 404).
  app.use(createBaseAuditRouter());

  app.use(
    createJobsRouter({
      dbKey: getBaseJobsDbKey(),
    }),
  );

  app.use(
    createCronRouter({
      dbKey: getBaseCronDbKey(),
      jobs: baseJobs,
      // Ticks enqueue via runBaseCron in the monolith; router is admin-only.
      enqueueJob: async () => ({}),
    }),
  );

  app.use(createErrorMiddleware());

  return {
    app,
    baseDbKey: dbKey,
  };
}
