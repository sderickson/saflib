import type { BaseServiceContextOptions } from "@saflib/base-service-common/context";
import {
  buildBaseHttpApp,
  type BaseHttpAppLease,
  type HttpRouterMount,
} from "@saflib/base-http-app";
import { createBaseRouter } from "@saflib/base-http/http";
import { isPublicMonolithRoute } from "./is-public-monolith-route.ts";

// BEGIN WORKFLOW AREA offshoot-router-imports FOR express/init
import { create__OffshootName__Router } from "@saflib/base-__offshoot-name__-http";
// END WORKFLOW AREA

/**
 * Every product router: the base feature's, then each offshoot's barrel router
 * (added by `express/init`). Feature http packages never mount each other; the
 * composition root does.
 */
export function productionMounts(): HttpRouterMount[] {
  return [
    { kind: "router", createRouter: createBaseRouter },
    // BEGIN WORKFLOW AREA offshoot-router-mounts FOR express/init
    { kind: "router", createRouter: create__OffshootName__Router },
    // END WORKFLOW AREA
  ];
}

/** Creates the full production HTTP server for the base service. */
export function createBaseHttpApp(
  options: BaseServiceContextOptions = {},
): BaseHttpAppLease {
  return buildBaseHttpApp({
    ...options,
    mounts: productionMounts(),
    isPublicRoute: isPublicMonolithRoute,
  });
}
