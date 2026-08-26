import express, { Router } from "express";
import { createListDevLogsHandler } from "./list-dev-logs.ts";
import { createStreamDevLogsHandler } from "./stream-dev-logs.ts";

/**
 * Development-only Winston log viewer:
 * - `GET /dev/logs` — JSON snapshot of the in-memory ring buffer
 * - `GET /dev/logs/stream` — SSE of new (and optionally replayed) log entries
 *
 * Gated on `DEPLOYMENT_NAME=development` and the ring buffer being enabled.
 */
export function createDevLogsRouter(): express.Router {
  const router = Router();

  router.get("/dev/logs", createListDevLogsHandler());
  router.get("/dev/logs/stream", createStreamDevLogsHandler());

  return router;
}
