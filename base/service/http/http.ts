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
  type TemplatesServiceContextOptions,
  makeContext,
} from "@saflib/base-service-common/context";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler

// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateTemplatesHttpAppOptions =
  TemplatesServiceContextOptions & {
    /**
     * Slim route tests mount one or more production routers. When omitted, every
     * product router from the workflow area below is mounted (monolith / smoke).
     */
    mounts?: HttpRouterMount[];
  };

export type TemplatesHttpAppLease = {
  app: express.Express;
  baseDbKey: DbKey;
};

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler

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
  options: CreateTemplatesHttpAppOptions = {},
): TemplatesHttpAppLease {
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

  app.use(createErrorMiddleware());

  return {
    app,
    baseDbKey: dbKey,
  };
}
