import type { BaseServiceContextOptions } from "@saflib/base-service-common/context";
import { groupRouterMounts } from "./routers.ts";
import {
  buildBaseHttpApp,
  type BaseHttpAppLease,
  type HttpRouterMount,
} from "./create-base-http-app.ts";

// BEGIN WORKFLOW AREA offshoot-router-imports FOR express/init
import { create__OffshootName__Router } from "@saflib/base-__offshoot-name__-http";
// END WORKFLOW AREA

export type { BaseHttpAppLease, HttpRouterMount } from "./create-base-http-app.ts";

export { buildBaseHttpApp } from "./create-base-http-app.ts";

/**
 * Default product + offshoot mounts for the monolith.
 * Handler groups: {@link groupRouterMounts} in `routers.ts` (`express/add-handler`).
 * Offshoots: import + mount in the `express/init` areas below.
 */
function defaultRouterMounts(): HttpRouterMount[] {
  return [
    ...groupRouterMounts(),
    // BEGIN WORKFLOW AREA offshoot-router-mounts FOR express/init
    { kind: "router", createRouter: create__OffshootName__Router },
    // END WORKFLOW AREA
  ];
}

export type CreateBaseHttpAppOptions = BaseServiceContextOptions & {
  /**
   * Slim route tests mount one or more production routers. When omitted, every
   * product + offshoot router above is mounted (monolith / smoke).
   */
  mounts?: HttpRouterMount[];
};

/**
 * Creates the HTTP server for the base service (production wiring).
 *
 * Route handler tests should mount a **group router** via
 * {@link acquireRouterSlimRouteTest} in `testing/slim-route-test.ts`, not this
 * factory with the default mount list. Use default mounts only for monolith
 * smoke tests (`index.test.ts`) or `*.integration.test.ts`.
 */
export function createBaseHttpApp(
  options: CreateBaseHttpAppOptions = {},
): BaseHttpAppLease {
  return buildBaseHttpApp({
    ...options,
    mounts: options.mounts ?? defaultRouterMounts(),
  });
}
