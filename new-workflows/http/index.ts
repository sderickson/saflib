import express, { type IRouter } from "express";
import { createErrorMiddleware } from "@saflib/express";
import type { DbKey } from "@saflib/drizzle";
import type { WorkflowDefinition } from "@saflib/new-workflows";
import { newWorkflowsHttpStorage } from "./context.ts";
import { createWorkflowsRouter } from "./routes/workflows/index.ts";
import { createRunsRouter } from "./routes/runs/index.ts";

export type { NewWorkflowsHttpContext } from "./context.ts";
export { newWorkflowsChangeEmitter, publishRunChanged } from "./change-emitter.ts";

export interface CreateNewWorkflowsRouterOptions {
  dbKey: DbKey;
  registry: WorkflowDefinition<any, any>[];
  /**
   * Default cwd for new runs (e.g. dev-site's repo checkout root). A
   * function is resolved fresh per request — needed when the host's own
   * value isn't known until its *own* per-request context is set up
   * (e.g. dev-site-http's `repo_root`, only available via its own
   * `devSiteHttpStorage` during a request, not at router-mount time).
   */
  defaultCwd: string | (() => string);
}

/**
 * Workflows router for monolith chrome — designed to be mounted into a
 * host app (e.g. `dev-site-http`), same shape as `jobs-http`'s
 * `createJobsRouter`. Owns its own `/api/workflows`/`/api/runs` paths;
 * only handles those — other paths fall through so sibling chrome routers
 * (and the host's own static/SPA serving) can run. Error middleware is
 * scoped to `/api` for the same reason (mirrors `createJobsRouter`
 * scoping its error middleware to `/jobs`): mounted with no path prefix,
 * this router's own blanket `notFoundHandler` would swallow every
 * otherwise-unmatched request reaching the host app, not just its own.
 */
export function createNewWorkflowsRouter(
  options: CreateNewWorkflowsRouterOptions,
): IRouter {
  const router = express.Router();
  const resolveDefaultCwd =
    typeof options.defaultCwd === "function" ? options.defaultCwd : () => options.defaultCwd as string;

  const innerRouter = express.Router();
  // Defensive, not load-bearing when mounted into a host that already
  // parses JSON globally (e.g. dev-site-http) — body-parser skips
  // re-parsing an already-parsed body, so this is safe either way and
  // keeps the router self-contained/testable on its own.
  innerRouter.use(express.json());
  innerRouter.use((_req, _res, next) => {
    newWorkflowsHttpStorage.run(
      {
        dbKey: options.dbKey,
        registry: options.registry,
        defaultCwd: resolveDefaultCwd(),
      },
      next,
    );
  });
  innerRouter.use(createWorkflowsRouter());
  innerRouter.use(createRunsRouter());
  innerRouter.use(createErrorMiddleware());

  router.use("/api", innerRouter);

  return router;
}
