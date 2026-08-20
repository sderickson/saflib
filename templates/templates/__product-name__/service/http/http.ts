import {
  createErrorMiddleware,
  createGlobalMiddleware,
  makeAuthMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { templatesDb } from "@saflib/templates-db/instances";
import {
  templatesServiceStorage,
  type TemplatesServiceContextOptions,
  makeContext,
} from "@saflib/templates-service-common/context";

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
  templatesDbKey: DbKey;
};

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler

    // END WORKFLOW AREA
  ];
}

/**
 * Creates the HTTP server for the templates service.
 *
 * Route handler tests should mount a **group router** via {@link acquireRouterSlimRouteTest}
 * in `testing/slim-route-test.ts`, not this factory with the default mount list.
 * Use default mounts only for monolith smoke tests (`index.test.ts`) or `*.integration.test.ts`.
 */
export function createTemplatesHttpApp(
  options: CreateTemplatesHttpAppOptions = {},
): TemplatesHttpAppLease {
  let dbKey = options.templatesDbKey;
  if (!dbKey) {
    dbKey = templatesDb.connect();
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
    templatesServiceStorage.run(context, () => {
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
    templatesDbKey: dbKey,
  };
}
