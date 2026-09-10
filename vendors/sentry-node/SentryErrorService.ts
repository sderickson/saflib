import * as Sentry from "@sentry/node";
import { addErrorCollector, getSafReporters } from "@saflib/node";
import { sanitizeTelemetryEvent } from "@saflib/utils/telemetry-sanitize";
import type {
  ErrorService,
  ListReportedErrorsOptions,
  ReportedErrorInput,
  ReportedErrorRecord,
} from "@saflib/errors-service";
import { typedEnv } from "./env.ts";

export type SentryErrorServiceOptions = {
  sendDefaultPii?: boolean;
};

export class SentryErrorService implements ErrorService {
  readonly isMocked = false;

  constructor(private readonly options: SentryErrorServiceOptions = {}) {}

  recordReportedError(input: ReportedErrorInput): ReportedErrorRecord {
    Sentry.captureMessage(input.message, {
      level: "error",
      extra: {
        kind: input.kind,
        source: input.source,
        stack: input.stack,
        metadata: input.metadata,
      },
    });
    return {
      id: 0,
      kind: input.kind,
      message: input.message,
      stack: input.stack,
      metadata: input.metadata ?? {},
      source: input.source,
      timestamp: new Date().toISOString(),
    };
  }

  listReportedErrors(_options?: ListReportedErrorsOptions): ReportedErrorRecord[] {
    return [];
  }

  installServerCollector(): void {
    const dsn = typedEnv.SENTRY_DSN;
    if (dsn === "mock" || !dsn) {
      return;
    }

    const sendDefaultPii = this.options.sendDefaultPii ?? false;

    Sentry.init({
      dsn,
      sendDefaultPii,
      beforeSend(event) {
        return sanitizeTelemetryEvent(event);
      },
    });

    addErrorCollector(({ error, level, extra, tags, user }) => {
      Sentry.captureException(error, {
        level,
        extra,
        tags,
        user,
      });
    });

    const { log } = getSafReporters();
    log.info(`Sentry initialized with DSN: ${dsn.slice(0, 16)}...`);
  }
}
