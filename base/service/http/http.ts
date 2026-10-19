export type {
  BaseHttpAppLease,
  HttpRouterMount,
} from "./app/create-base-http-app.ts";

export { buildBaseHttpApp } from "./app/create-base-http-app.ts";

/**
 * This package's handler groups ({@link groupRouterMounts} in `routers.ts`,
 * grown with `express/add-handler`). The composition root
 * (`service/monolith/http.ts`) mounts them alongside offshoot routers.
 */
export { groupRouterMounts } from "./routers.ts";
