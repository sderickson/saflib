import express, { type IRouter } from "express";

/**
 * Minimal __offshoot-name__ router. Grow with express/add-handler (cwd in this package).
 */
export function create__OffshootName__Router(): IRouter {
  const router = express.Router();

  // BEGIN WORKFLOW AREA route-registrations FOR express/add-handler
  router.get("/__offshoot-name__/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  // END WORKFLOW AREA

  return router;
}
