import createError from "http-errors";
import { assertDevelopmentObservabilityAvailable } from "@saflib/env";
import { isDevLogBufferEnabled } from "../lib/devLogBuffer.ts";

export function assertDevLogsAvailable(): void {
  assertDevelopmentObservabilityAvailable("Dev logs");
  if (!isDevLogBufferEnabled()) {
    throw createError(503, "Dev log buffer is not enabled");
  }
}

export function parseAfterId(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw createError(400, "Invalid after / Last-Event-ID");
  }
  return n;
}
