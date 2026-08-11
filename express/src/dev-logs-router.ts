import express, { Router } from "express";
import createError from "http-errors";
import { createHandler } from "./handler.ts";
import {
  getDevLogs,
  isDevLogBufferEnabled,
  subscribeDevLogs,
  typedEnv,
  type DevLogEntry,
} from "@saflib/node";
import {
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTION_MS,
  writeSseComment,
  writeSseEvent,
} from "@saflib/notify";

function assertDevLogsAvailable(): void {
  if (typedEnv.DEPLOYMENT_NAME !== "development") {
    throw createError(403, "Dev logs are only available in development");
  }
  if (!isDevLogBufferEnabled()) {
    throw createError(503, "Dev log buffer is not enabled");
  }
}

function parseAfterId(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw createError(400, "Invalid after / Last-Event-ID");
  }
  return n;
}

function writeLogFrame(
  res: { write(chunk: string): unknown },
  entry: DevLogEntry,
): void {
  writeSseEvent(res, {
    event: "log",
    data: entry,
    id: String(entry.id),
  });
}

/**
 * Development-only Winston log viewer:
 * - `GET /dev/logs` — JSON snapshot of the in-memory ring buffer
 * - `GET /dev/logs/stream` — SSE of new (and optionally replayed) log entries
 *
 * Gated on `DEPLOYMENT_NAME=development` and the node-side buffer being enabled.
 */
export function createDevLogsRouter(): express.Router {
  const router = Router();

  router.get(
    "/dev/logs",
    createHandler(async (req, res) => {
      assertDevLogsAvailable();
      const afterId = parseAfterId(
        typeof req.query.after === "string" ? req.query.after : undefined,
      );
      const limitRaw =
        typeof req.query.limit === "string" ? req.query.limit : undefined;
      let limit: number | undefined;
      if (limitRaw !== undefined) {
        limit = Number(limitRaw);
        if (!Number.isFinite(limit) || limit < 0) {
          throw createError(400, "Invalid limit");
        }
      }
      const logs = getDevLogs({ afterId, limit });
      res.status(200).json({ logs });
    }),
  );

  router.get(
    "/dev/logs/stream",
    createHandler(async (req, res) => {
      assertDevLogsAvailable();

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
      }

      const afterId = parseAfterId(req.get("last-event-id") ?? undefined);
      if (afterId !== undefined) {
        for (const entry of getDevLogs({ afterId })) {
          writeLogFrame(res, entry);
        }
      }

      const unsubscribe = subscribeDevLogs((entry) => {
        writeLogFrame(res, entry);
      });

      const heartbeat = setInterval(() => {
        writeSseComment(res, "heartbeat");
      }, SSE_HEARTBEAT_INTERVAL_MS);

      let settled = false;
      let resolveClose: (() => void) | undefined;

      const settle = () => {
        if (settled) return;
        settled = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        unsubscribe();
        resolveClose?.();
      };

      const lifetime = setTimeout(() => {
        settle();
        res.end();
      }, SSE_MAX_CONNECTION_MS);

      await new Promise<void>((resolve) => {
        resolveClose = resolve;
        req.on("close", settle);
        res.on("close", settle);
      });
    }),
  );

  return router;
}
