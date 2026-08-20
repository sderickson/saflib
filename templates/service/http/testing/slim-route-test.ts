import type { Express, Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { templatesDb } from "@saflib/templates-db/instances";
import {
  createTemplatesHttpApp,
  type TemplatesHttpAppLease,
  type HttpRouterMount,
} from "../http.ts";

export type SlimRouteTestContext = {
  app: Express;
  lease: TemplatesHttpAppLease;
  dbKey: DbKey;
};

/**
 * Builds a slim HTTP app for route tests (single router or small router group).
 * Call {@link releaseSlimRouteTest} in `afterAll`.
 */
export function acquireSlimRouteTest(options: {
  mounts: HttpRouterMount[];
}): SlimRouteTestContext {
  const lease = createTemplatesHttpApp({ mounts: options.mounts });
  return {
    app: lease.app,
    lease,
    dbKey: lease.templatesDbKey,
  };
}

/** Slim app mounting one production route router (forms, todos, etc.). */
export function acquireRouterSlimRouteTest(
  createRouter: () => Router,
): SlimRouteTestContext {
  return acquireSlimRouteTest({
    mounts: [{ kind: "router", createRouter }],
  });
}

/** Slim app mounting multiple production route routers (small integration chains). */
export function acquireRouterSlimRouteTestMulti(
  createRouters: Array<() => Router>,
): SlimRouteTestContext {
  return acquireSlimRouteTest({
    mounts: createRouters.map((createRouter) => ({
      kind: "router",
      createRouter,
    })),
  });
}

export function releaseSlimRouteTest(lease: TemplatesHttpAppLease): void {
  templatesDb.disconnect(lease.templatesDbKey);
}
