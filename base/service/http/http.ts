import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAuthMiddleware,
  makeContextMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { createEmailsRouter } from "@saflib/email";
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
import { createJobsDemoRouter } from "./handlers/jobs-demo/index.ts";
import { isPublicMonolithRoute } from "./is-public-monolith-route.ts";
import { groupRouterMounts } from "./routers.ts";

// BEGIN WORKFLOW AREA offshoot-router-imports FOR express/init
import { create__OffshootName__Router } from "@saflib/base-__offshoot-name__-http";
// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateBaseHttpAppOptions = BaseServiceContextOptions & {
  /**
   * Slim route tests mount one or more production routers. When omitted, every
   * product + offshoot router below is mounted (monolith / smoke).
   */
  mounts?: HttpRouterMount[];
};

export type BaseHttpAppLease = {
  app: express.Express;
  baseDbKey: DbKey;
};

/**
 * Once-only compose: middleware, baked-in demo/platform routers, and barrels.
 * New handler groups go in {@link groupRouterMounts} (`routers.ts`).
 * New offshoots: one import + mount in the `express/init` areas below.
 */
function defaultRouterMounts(): HttpRouterMount[] {
  return [
    ...groupRouterMounts(),
    { kind: "router", createRouter: createJobsDemoRouter },
    // BEGIN WORKFLOW AREA offshoot-router-mounts FOR express/init
    { kind: "router", createRouter: create__OffshootName__Router },
    // END WORKFLOW AREA
  ];
}

/**
 * Creates the HTTP server for the base service.
 *
 * Route handler tests should mount a **group router** via {@link acquireRouterSlimRouteTest}
 * in `testing/slim-route-test.ts`, not this factory with the default mount list.
 * Use default mounts only for monolith smoke tests (`index.test.ts`) or `*.integration.test.ts`.
 */
export function createBaseHttpApp(
  options: CreateBaseHttpAppOptions = {},
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

  // Mock email inspection (GET /email/sent) — before auth gate; scoped OpenAPI middleware handles the route.
  app.use(createEmailsRouter());

  // Resolve identity into SafContext before the global auth gate / route handlers.
  app.use(makeContextMiddleware());

  const globalAuthMiddleware = makeAuthMiddleware();
  app.use((req, res, next) => {
    // Public / no-auth routes skip the early gate so OpenAPI tags on the
    // operation scoped chain can authorize; keep in sync with Caddy
    // `@public_monolith` and {@link isPublicMonolithRoute}.
    if (isPublicMonolithRoute(req)) {
      next();
      return;
    }
    globalAuthMiddleware(req, res, next);
  });

  app.use(baseAuditRecorderMiddleware());

  const mounts = options.mounts ?? defaultRouterMounts();
  for (const mount of mounts) {
    app.use(mount.createRouter());
  }

  app.use(createBaseAuditRouter());

  app.use(
    createJobsRouter({
      dbKey: getBaseJobsDbKey(),
    }),
  );

  // Cron admin API after product routers (terminator middleware on /cron only).
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
