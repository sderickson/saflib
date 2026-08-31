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
import type { JobTriggerMap } from "./annotate-spec-inventory-jobs.ts";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { createCommitsRouter } from "./routes/commits/index.ts";
import { createScanRouter } from "./routes/scan/index.ts";
import { createCheckoutRouter } from "./routes/checkout/index.ts";
import { createRepoRouter } from "./routes/repo/index.ts";
// END WORKFLOW AREA

export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export type CreateDevSiteHttpAppOptions = {
  devSiteDbKey?: DbKey;
  /** Absolute path to the git repo to analyze. Defaults to process.cwd(). */
  repo_root?: string;
  /** Path prefix within the repo (e.g. `products`). Defaults to "". */
  product_root?: string;
  /** Main branch ref. Defaults to `main`. */
  mainRef?: string;
  /** GitHub `owner/name` for UI source/commit links. */
  github_repo?: string;
  /**
   * Directory of built SPA assets (Vite `dist`). When set, Express serves them
   * and falls back to `index.html` for client-side routes. API routes live under
   * `/api/*` so they do not collide with SPA paths like `/checkout`.
   */
  staticDir?: string;
  /**
   * Slim route tests mount one or more production routers. When omitted, every
   * product router from the workflow area below is mounted (monolith / smoke).
   */
  mounts?: HttpRouterMount[];
  /**
   * Optional product job graph (e.g. `productTriggerMap`). Annotates Spec
   * inventory ops with enqueue edges for route cards.
   */
  jobTriggerMap?: JobTriggerMap;
};

export type DevSiteHttpAppLease = {
  app: express.Express;
  devSiteDbKey: DbKey;
};

function buildDevSiteRuntimeConfigScript(config: {
  github_repo?: string;
  githubRef?: string;
}): string | undefined {
  const payload: Record<string, string> = {};
  if (config.github_repo) {
    payload.github_repo = config.github_repo;
  }
  if (config.githubRef) {
    payload.githubRef = config.githubRef;
  }
  if (Object.keys(payload).length === 0) {
    return undefined;
  }
  return `<script>window.__DEV_SITE_CONFIG__=${JSON.stringify(payload)}</script>`;
}

export function injectDevSiteRuntimeConfig(
  html: string,
  script: string,
): string {
  if (html.includes("</head>")) {
    return html.replace("</head>", `${script}</head>`);
  }
  return `${script}${html}`;
}

function defaultRouterMounts(): HttpRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA default-router-mounts FOR express/add-handler
    { kind: "router", createRouter: createCommitsRouter },
    { kind: "router", createRouter: createScanRouter },
    { kind: "router", createRouter: createCheckoutRouter },
    { kind: "router", createRouter: createRepoRouter },
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

  const repo_root = options.repo_root ?? process.cwd();
  const product_root = options.product_root ?? "";
  const mainRef = options.mainRef ?? "main";
  const github_repo = options.github_repo;
  const dbPath = devSiteDb.getDbPath(dbKey!);
  const jobTriggerMap = options.jobTriggerMap;

  const app = express();
  app.use(
    createGlobalMiddleware({
      disableCors: true,
    }),
  );
  app.set("trust proxy", 1);

  app.use((_req, _res, next) => {
    devSiteHttpStorage.run(
      { dbKey: dbKey!, repo_root, product_root, mainRef, github_repo, dbPath, jobTriggerMap },
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
    const runtimeConfigScript = buildDevSiteRuntimeConfigScript({
      github_repo,
    });

    const sendSpaIndex = (_req: express.Request, res: express.Response) => {
      let html = fs.readFileSync(indexHtml, "utf8");
      if (runtimeConfigScript && !html.includes("__DEV_SITE_CONFIG__")) {
        html = injectDevSiteRuntimeConfig(html, runtimeConfigScript);
      }
      res.type("html").send(html);
    };

    app.use(express.static(staticRoot, { index: false }));
    app.get(/.*/, (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      if (!fs.existsSync(indexHtml)) {
        next();
        return;
      }
      sendSpaIndex(req, res);
    });
  } else {
    // Live-dev: API has no SPA. Soft-hint browsers that still hit :3099.
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      const accept = req.headers.accept ?? "";
      if (!accept.includes("text/html")) {
        next();
        return;
      }
      const ui = `http://localhost:5199${req.path === "/" ? "/" : req.path}`;
      res.status(404).type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>dev-site API</title></head>
<body style="font-family:system-ui;line-height:1.4;padding:2rem;max-width:36rem">
  <h1>API only on this port</h1>
  <p>Live-dev serves the UI from Vite (HMR), not Express.</p>
  <p>Open <a href="${ui}">${ui}</a></p>
  <p>API routes are under <code>/api/*</code> (e.g. <code>/api/checkout</code>).</p>
</body></html>`);
    });
  }

  app.use(createErrorMiddleware());

  return {
    app,
    devSiteDbKey: dbKey,
  };
}
