import { type Handler, Router } from "express";

/**
 * Health Check Router
 * Provides a basic health check endpoint for container orchestration
 * readiness/liveness probes
 */
export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.send("OK");
});

export const createHealthHandler = (
  healthCheck: () => Promise<boolean>,
): Handler => {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const isHealthy = await healthCheck();
    res.status(isHealthy ? 200 : 503).send(isHealthy ? "OK" : "NOT OK");
  });
  return router;
};
