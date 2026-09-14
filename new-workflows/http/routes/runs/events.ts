import { createHandler } from "@saflib/express";
import {
  SSE_HEARTBEAT_INTERVAL_MS,
  SSE_MAX_CONNECTION_MS,
  writeSseComment,
  writeSseEvent,
} from "@saflib/notify";
import type { ChangeEventWithId } from "@saflib/notify";
import { newWorkflowsChangeEmitter, runEventsChannel } from "../../change-emitter.ts";

/**
 * SSE hints only — no log content on the wire (per spec.md's "hints, not
 * payloads" design). The frontend re-fetches `/runs/:runId/logs` in
 * response, same shape as `node-log-http`'s `createStreamDevLogsHandler`
 * but backed by `@saflib/notify`'s emitter instead of a bespoke buffer.
 */
export const streamWorkflowRunEventsHandler = createHandler(async (req, res) => {
  const runId = req.params.runId as string;
  const channelId = runEventsChannel(runId);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const writeChangeFrame = (event: ChangeEventWithId) => {
    writeSseEvent(res, { event: "change", data: event, id: event.id });
  };

  const lastEventId = req.get("last-event-id") ?? undefined;
  if (lastEventId !== undefined) {
    for (const event of newWorkflowsChangeEmitter.getEventsAfter(channelId, lastEventId)) {
      writeChangeFrame(event);
    }
  }

  const unsubscribe = newWorkflowsChangeEmitter.subscribe(channelId, writeChangeFrame);

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
