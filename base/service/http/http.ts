import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAuthMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { baseDb } from "@saflib/base-db/instances";
import {
  baseServiceStorage,
  type BaseServiceContextOptions,
  makeContext,
} from "@saflib/base-service-common/context";
// BEGIN WORKFLOW AREA cron-imports FOR cron/init
import { createCronRouter } from "@saflib/cron";
import { baseJobs, getBaseCronDbKey } from "@saflib/base-cron";
// END WORKFLOW AREA

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./handlers/__group-name__/index.ts";
// END WORKFLOW AREA

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
   * product router from the workflow area below is mounted (monolith / smoke).
   */
  mounts?: HttpRouterMount[];
};

export type BaseHttpAppLease = {
  app: express.Express;
  baseDbKey: DbKey;
};

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler
    { kind: "router", createRouter: create__GroupName__Router },
    // END WORKFLOW AREA
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

  const context = makeContext();
  app.use((_req, _res, next) => {
    baseServiceStorage.run(context, () => {
      next();
    });
  });

  app.use(makeAuthMiddleware());

  const mounts = options.mounts ?? defaultRouterMounts();
  for (const mount of mounts) {
    app.use(mount.createRouter());
  }

  // BEGIN WORKFLOW AREA app-use-routes FOR express/add-handler


  // END WORKFLOW AREA

  // Cron admin API after product routers (terminator middleware on /cron only).
  // BEGIN WORKFLOW AREA cron-router FOR cron/init
  app.use(
    createCronRouter({
      dbKey: getBaseCronDbKey(),
      jobs: baseJobs,
      // Ticks enqueue via runBaseCron in the monolith; router is admin-only.
      enqueueJob: async () => ({}),
    }),
  );
  // END WORKFLOW AREA

  app.use(createErrorMiddleware());

  return {
    app,
    baseDbKey: dbKey,
  };
}
