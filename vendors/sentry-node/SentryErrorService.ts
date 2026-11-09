import * as Sentry from "@sentry/node";
import { addErrorCollector, getSafReporters } from "@saflib/node";
import {
  sanitizeTelemetryEvent,
  TELEMETRY_SENTRY_DATA_COLLECTION,
} from "@saflib/utils/telemetry-sanitize";
import type {
  ErrorService,
  ListReportedErrorsOptions,
  ReportedErrorInput,
  ReportedErrorRecord,
} from "@saflib/errors-service";
import { typedEnv } from "./env.ts";

export type SentryErrorServiceOptions = {
  /**
   * True lets Sentry collect what it does by default (user info, cookies,
   * headers, bodies, query params). Off by default: SAF sends errors only.
   */
  sendDefaultPii?: boolean;
};

export class SentryErrorService implements ErrorService {
  readonly isMocked = false;
  private readonly options: SentryErrorServiceOptions;

  constructor(options: SentryErrorServiceOptions = {}) {
    this.options = options;
  }

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

  listReportedErrors(
    _options?: ListReportedErrorsOptions,
  ): ReportedErrorRecord[] {
    return [];
  }

  installServerCollector(): void {
    const dsn = typedEnv.SENTRY_DSN;
    if (dsn === "mock" || !dsn) {
      return;
    }

    // Sentry v11 replaced sendDefaultPii (off by default) with dataCollection,
    // which collects user info, cookies, headers and bodies unless told not to.
    const sendDefaultPii = this.options.sendDefaultPii ?? false;

    Sentry.init({
      dsn,
      ...(sendDefaultPii
        ? {}
        : { dataCollection: TELEMETRY_SENTRY_DATA_COLLECTION }),
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
