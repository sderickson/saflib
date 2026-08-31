import express, { type IRouter } from "express";
import { groupRouterMounts } from "./routers.ts";

/**
 * __offshoot-name__ barrel router — mounted once by the parent http app.
 * Grow groups with `express/add-handler` (cwd in this package → `routers.ts`).
 */
export function create__OffshootName__Router(): IRouter {
  const router = express.Router();

  router.get("/__offshoot-name__/health", (_req, res) => {
    res.json({ health: { status: "ok" } });
  });

  for (const mount of groupRouterMounts()) {
    router.use(mount.createRouter());
  }

  return router;
}
