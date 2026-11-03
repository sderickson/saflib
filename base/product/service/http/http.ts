import express, { type IRouter } from "express";
import { groupRouterMounts } from "./routers.ts";

/**
 * The base feature's router: every handler group in `routers.ts` (grown with
 * `express/add-handler`). The composition root (`service/monolith/http.ts`)
 * mounts it alongside each offshoot's router.
 */
export function createBaseRouter(): IRouter {
  const router = express.Router();
  for (const mount of groupRouterMounts()) {
    router.use(mount.createRouter());
  }
  return router;
}
