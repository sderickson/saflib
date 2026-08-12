import {
  createErrorMiddleware,
  createGlobalMiddleware,
} from "@saflib/express";
import express, { type Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import path from "node:path";
import fs from "node:fs";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { devSiteHttpStorage } from "./context.ts";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { createCommitsRouter } from "./routes/commits/index.ts";
import { createScanRouter } from "./routes/scan/index.ts";
// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateDevSiteHttpAppOptions = {
  devSiteDbKey?: DbKey;
  /** Absolute path to the git repo to analyze. Defaults to process.cwd(). */
  repoRoot?: string;
  /** Path prefix within the repo (e.g. `daemon`). Defaults to "". */
  productRoot?: string;
  /** Main branch ref. Defaults to `main`. */
  mainRef?: string;
  /**
   * Directory of built SPA assets (Vite `dist`). When set, Express serves them
   * and falls back to `index.html` for client-side routes.
   */
  staticDir?: string;
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
    { kind: "router", createRouter: createCommitsRouter },
    { kind: "router", createRouter: createScanRouter },
    // END WORKFLOW AREA
  ];
}

/**
 * Creates the HTTP server for the dev-site service.
 *
 * Route handler tests should mount a **group router** via {@link acquireRouterSlimRouteTest}
 * in `testing/slim-route-test.ts`, not this factory with the default mount list.
 */
export function createDevSiteHttpApp(
  options: CreateDevSiteHttpAppOptions = {},
): DevSiteHttpAppLease {
  let dbKey = options.devSiteDbKey;
  if (!dbKey) {
    dbKey = devSiteDb.connect();
  }

  const repoRoot = options.repoRoot ?? process.cwd();
  const productRoot = options.productRoot ?? "";
  const mainRef = options.mainRef ?? "main";
  const dbPath = devSiteDb.getDbPath(dbKey!);

  const app = express();
  app.use(
    createGlobalMiddleware({
      disableCors: true,
    }),
  );
  app.set("trust proxy", 1);

  app.use((_req, _res, next) => {
    devSiteHttpStorage.run(
      { dbKey: dbKey!, repoRoot, productRoot, mainRef, dbPath },
      () => next(),
    );
  });

  const mounts = options.mounts ?? defaultRouterMounts();
  for (const mount of mounts) {
    app.use(mount.createRouter());
  }

  // BEGIN WORKFLOW AREA app-use-routes FOR express/add-handler

  // END WORKFLOW AREA

  if (options.staticDir) {
    const staticRoot = path.resolve(options.staticDir);
    const indexHtml = path.join(staticRoot, "index.html");
    app.use(express.static(staticRoot, { index: false }));
    app.get(/.*/, (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (!fs.existsSync(indexHtml)) {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  app.use(createErrorMiddleware());

  return {
    app,
    devSiteDbKey: dbKey,
  };
}
