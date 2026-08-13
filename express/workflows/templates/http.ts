import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAuthMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { __serviceName__Db } from "template-package-db/instances";
import {
  __serviceName__ServiceStorage,
  type __ServiceName__ServiceContextOptions,
  makeContext,
} from "template-package-service-common/context";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./handlers/__group-name__/index.ts";
// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type Create__ServiceName__HttpAppOptions =
  __ServiceName__ServiceContextOptions & {
    /**
     * Slim route tests mount one or more production routers. When omitted, every
     * product router from the workflow area below is mounted (monolith / smoke).
     */
    mounts?: HttpRouterMount[];
  };

export type __ServiceName__HttpAppLease = {
  app: express.Express;
  __serviceName__DbKey: DbKey;
};

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler
    { kind: "router", createRouter: create__GroupName__Router },
    // END WORKFLOW AREA
  ];
}

/**
 * Creates the HTTP server for the __service-name__ service.
 *
 * Route handler tests should mount a **group router** via {@link acquireRouterSlimRouteTest}
 * in `testing/slim-route-test.ts`, not this factory with the default mount list.
 * Use default mounts only for monolith smoke tests (`index.test.ts`) or `*.integration.test.ts`.
 */
export function create__ServiceName__HttpApp(
  options: Create__ServiceName__HttpAppOptions = {},
): __ServiceName__HttpAppLease {
  let dbKey = options.__serviceName__DbKey;
  if (!dbKey) {
    dbKey = __serviceName__Db.connect();
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
    __serviceName__ServiceStorage.run(context, () => {
      next();
    });
  });

  app.use(makeAuthMiddleware());

  const mounts = options.mounts ?? defaultRouterMounts();
  for (const mount of mounts) {
    app.use(mount.createRouter());
  }

  // BEGIN WORKFLOW AREA app-use-routes FOR express/add-handler
  // Monolith wiring: add `create…Router()` entries to defaultRouterMounts() above.
  // Do not mount routers here — slim tests and production share the same router factories.
  // END WORKFLOW AREA

  app.use(createErrorMiddleware());

  return {
    app,
    __serviceName__DbKey: dbKey,
  };
}
