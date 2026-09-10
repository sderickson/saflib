import { addErrorCollector, type ErrorCollectorParam } from "@saflib/node";
import type {
  ErrorService,
  ListReportedErrorsOptions,
  ReportedErrorInput,
  ReportedErrorRecord,
} from "../types.ts";
import {
  listReportedErrors,
  recordReportedError,
} from "./reportedErrorBuffer.ts";

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

export class InMemoryErrorService implements ErrorService {
  readonly isMocked = true;

  recordReportedError(input: ReportedErrorInput): ReportedErrorRecord {
    return recordReportedError(input);
  }

  listReportedErrors(
    options?: ListReportedErrorsOptions,
  ): ReportedErrorRecord[] {
    return listReportedErrors(options);
  }

  installServerCollector(): void {
    addErrorCollector(recordFromCollector);
  }
}

export { CSP_INGEST_MESSAGE };
