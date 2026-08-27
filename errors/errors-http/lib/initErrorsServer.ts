import { addErrorCollector } from "@saflib/node";
import type { ErrorCollectorParam } from "@saflib/node";
import { recordReportedError } from "./reportedErrorBuffer.ts";

const CSP_INGEST_MESSAGE = "Content-Security-Policy violation (ingested)";

function serverKindFromMessage(message: string): "server" | "test" {
  if (message.includes("Intentional admin test error")) {
    return "test";
  }
  return "server";
}

function recordFromCollector(param: ErrorCollectorParam): void {
  if (param.error.message === CSP_INGEST_MESSAGE) {
    return;
  }

  recordReportedError({
    kind: serverKindFromMessage(param.error.message),
    message: param.error.message,
    stack: param.error.stack,
    metadata: {
      level: param.level,
      extra: param.extra,
      tags: param.tags,
      user: param.user,
    },
    source:
      typeof param.tags?.["subsystem.name"] === "string"
        ? param.tags["subsystem.name"]
        : "server",
  });
}

/**
 * Wire the error ring buffer collector (without Sentry). Safe to call once at boot.
 * For Sentry forwarding, use `@saflib/vendors-sentry` `configureSentry()`.
 */
export function installReportedErrorCollector(): void {
  addErrorCollector(recordFromCollector);
}

export { CSP_INGEST_MESSAGE };
