import createError from "http-errors";
import { isDevLogBufferEnabled } from "../lib/devLogBuffer.ts";

function deploymentName(): string {
  return process.env.DEPLOYMENT_NAME ?? "";
}

export function assertDevLogsAvailable(): void {
  if (deploymentName() !== "development") {
    throw createError(403, "Dev logs are only available in development");
  }
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
