import type { Express, Router } from "express";
import type { DbKey } from "@saflib/drizzle";
import { __serviceName__Db } from "template-package-db/instances";
import {
  create__ServiceName__HttpApp,
  type __ServiceName__HttpAppLease,
  type HttpRouterMount,
} from "../http.ts";

export type SlimRouteTestContext = {
  app: Express;
  lease: __ServiceName__HttpAppLease;
  dbKey: DbKey;
};

/**
 * Builds a slim HTTP app for route tests (single router or small router group).
 * Call {@link releaseSlimRouteTest} in `afterAll`.
 */
export function acquireSlimRouteTest(options: {
  mounts: HttpRouterMount[];
}): SlimRouteTestContext {
  const lease = create__ServiceName__HttpApp({ mounts: options.mounts });
  return {
    app: lease.app,
    lease,
    dbKey: lease.__serviceName__DbKey,
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

export function releaseSlimRouteTest(lease: __ServiceName__HttpAppLease): void {
  __serviceName__Db.disconnect(lease.__serviceName__DbKey);
}
