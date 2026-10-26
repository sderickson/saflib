import express, {
  type Express,
  type Request,
  type RequestHandler,
  type Router,
} from "express";
import { makeAuthMiddleware } from "../middleware/auth.ts";
import {
  createErrorMiddleware,
  createGlobalMiddleware,
  type GlobalMiddlewareOptions,
} from "../middleware/composition.ts";
import { makeContextMiddleware } from "../middleware/context.ts";

/** A feature's router, mounted as-is (each route carries its own scoped middleware). */
export type HttpRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

export interface CreateProductHttpAppOptions {
  /** Feature routers, in mount order. The composition root passes every one; route tests pass a few. */
  mounts: HttpRouterMount[];
  /**
   * Requests that skip the global session gate, so their operation's own
   * `security` (or `x-public`) decides. Keep in sync with the reverse proxy's
   * public routes.
   */
  isPublicRoute: (req: Request) => boolean;
  /**
   * Requests whose auth is decided later in the scoped middleware rather than
   * by the global gate (e.g. internal calls carrying an identity assertion).
   */
  deferAuth?: (req: Request) => boolean;
  /** Runs each request inside the product's service context (AsyncLocalStorage). */
  runInContext?: (next: () => void) => void;
  /** Options for {@link createGlobalMiddleware}. */
  globalMiddleware?: GlobalMiddlewareOptions;
  /** Before the global middleware (e.g. a body parser that keeps the raw bytes). */
  beforeGlobal?: RequestHandler[];
  /** After the service context, before identity is resolved (e.g. header injection for internal calls). */
  beforeIdentity?: RequestHandler[];
  /** Mounted before the auth gate: error reporting and, in development, observability routes. */
  publicRouters?: Array<Router | RequestHandler>;
  /** After the auth gate, before feature routers (audit recorder, consent, change events). */
  afterAuth?: RequestHandler[];
  /** After feature routers (audit, jobs, cron, OAuth). A catch-all 404 router belongs last. */
  platformRouters?: Array<Router | RequestHandler>;
}

/**
 * The HTTP app shell every SAF product shares. Order:
 *
 * 1. `beforeGlobal`, global middleware (helmet, CSRF token, logging, body parsing), `trust proxy`;
 * 2. the service context (`runInContext`), `beforeIdentity`, identity resolution;
 * 3. `publicRouters`;
 * 4. the auth gate (skipped for `isPublicRoute` / `deferAuth` requests);
 * 5. `afterAuth`, feature `mounts`, `platformRouters`;
 * 6. the error handlers.
 *
 * A product's `http-app` package supplies these; its composition root supplies the mounts.
 */
export function createProductHttpApp(
  options: CreateProductHttpAppOptions,
): Express {
  const app = express();
  for (const middleware of options.beforeGlobal ?? []) app.use(middleware);
  for (const middleware of createGlobalMiddleware(options.globalMiddleware)) {
    app.use(middleware);
  }
  app.set("trust proxy", 1);

  const { runInContext } = options;
  if (runInContext) {
    app.use((_req, _res, next) => runInContext(() => next()));
  }
  for (const middleware of options.beforeIdentity ?? []) app.use(middleware);
  app.use(makeContextMiddleware());

  for (const router of options.publicRouters ?? []) app.use(router);

  const authGate = makeAuthMiddleware();
  const { isPublicRoute, deferAuth } = options;
  app.use((req, res, next) => {
    if (deferAuth?.(req) || isPublicRoute(req)) {
      next();
      return;
    }
    authGate(req, res, next);
  });

  for (const middleware of options.afterAuth ?? []) app.use(middleware);
  for (const mount of options.mounts) app.use(mount.createRouter());
  for (const router of options.platformRouters ?? []) app.use(router);

  for (const middleware of createErrorMiddleware()) app.use(middleware);
  return app;
}
