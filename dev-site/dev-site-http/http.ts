import {
  createErrorMiddleware,
  createGlobalMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { devSiteDb } from "@saflib/dev-site-db/instances";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler

// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateDevSiteHttpAppOptions = {
  devSiteDbKey?: DbKey;
  /**
   * Slim route tests mount one or more production routers. When omitted, every
   * product router from the workflow area below is mounted (monolith / smoke).
   */
  mounts?: HttpRouterMount[];
};

export type DevSiteHttpAppLease = {
  app: express.Express;
  devSiteDbKey: DbKey;
};

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler

    // END WORKFLOW AREA
  ];
}

/**
 * Creates the HTTP server for the dev-site service.
 *
 * Route handler tests should mount a **group router** via {@link acquireRouterSlimRouteTest}
 * in `testing/slim-route-test.ts`, not this factory with the default mount list.
 * Use default mounts only for monolith smoke tests (`index.test.ts`) or `*.integration.test.ts`.
 */
export function createDevSiteHttpApp(
  options: CreateDevSiteHttpAppOptions = {},
): DevSiteHttpAppLease {
  let dbKey = options.devSiteDbKey;
  if (!dbKey) {
    dbKey = devSiteDb.connect();
  }

  const app = express();
  app.use(
    createGlobalMiddleware({
      disableCors: true,
    }),
  );
  app.set("trust proxy", 1);

  // NOTE: no per-request context/auth middleware (dev-site is a local,
  // single-operator tool for v1 -- see dev-site.spec.md "Security" section).

  const mounts = options.mounts ?? defaultRouterMounts();
  for (const mount of mounts) {
    app.use(mount.createRouter());
  }

  // BEGIN WORKFLOW AREA app-use-routes FOR express/add-handler


  // END WORKFLOW AREA

  app.use(createErrorMiddleware());

  return {
    app,
    devSiteDbKey: dbKey,
  };
}
