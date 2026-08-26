import * as Sentry from "@sentry/node";
import { addErrorCollector, getSafReporters } from "@saflib/node";
import type { ErrorCollectorParam } from "@saflib/node";
import { recordReportedError } from "./reportedErrorBuffer.ts";

export type InitErrorsServerOptions = {
  sendDefaultPii?: boolean;
};

const CSP_INGEST_MESSAGE = "Content-Security-Policy violation (ingested)";

function sentryDsn(): string | undefined {
  return process.env.SENTRY_DSN;
}

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
 */
export function installReportedErrorCollector(): void {
  addErrorCollector(recordFromCollector);
}

/**
 * Wire the error ring buffer and optional Sentry forwarding for Node services.
 * Call once during monolith boot (replaces `@saflib/sentry` init).
 */
export function initErrorsServer(options: InitErrorsServerOptions = {}): void {
  const { log } = getSafReporters();

  installReportedErrorCollector();

  if (sentryDsn() === "mock" || !sentryDsn()) {
    return;
  }

  const sendDefaultPii = options.sendDefaultPii ?? false;

  Sentry.init({
    dsn: sentryDsn(),
    sendDefaultPii,
  });

  addErrorCollector(({ error, level, extra, tags, user }) => {
    Sentry.captureException(error, {
      level,
      extra,
      tags,
      user,
    });
  });

  log.info(
    `Sentry initialized with DSN: ${sentryDsn()!.slice(0, 16) + "..."}`,
  );
}

/** @deprecated Use {@link initErrorsServer}. */
export const initSentry = initErrorsServer;

export { CSP_INGEST_MESSAGE };
