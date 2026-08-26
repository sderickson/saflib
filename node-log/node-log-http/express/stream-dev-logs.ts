import { createHandler } from "./handler.ts";
import {
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTION_MS,
  writeSseComment,
  writeSseEvent,
} from "@saflib/notify";
import type { DevLogEntry } from "../lib/devLogBuffer.ts";
import {
  getDevLogs,
  subscribeDevLogs,
} from "../lib/devLogBuffer.ts";
import { assertDevLogsAvailable, parseAfterId } from "./dev-logs-shared.ts";

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

export function createStreamDevLogsHandler() {
  return createHandler(async (req, res) => {
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
  });
}
