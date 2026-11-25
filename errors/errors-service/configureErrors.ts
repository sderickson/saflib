import type { ErrorService, ReportedErrorInput, ReportedErrorRecord } from "./types.ts";

let errorService: ErrorService | undefined;

/** Extra destination for browser-reported errors (client, CSP), alongside the error service. */
export type ReportedErrorSink = (input: ReportedErrorInput) => void;
const sinks: ReportedErrorSink[] = [];

export function hasErrorService(): boolean {
  return errorService !== undefined;
}

/**
 * Sets the process-level error service and wires its server collector.
 * Idempotent — subsequent calls are no-ops.
 */
export function setErrorService(service: ErrorService): void {
  if (errorService) {
    return;
  }
  errorService = service;
  service.installServerCollector();
}

export function getErrorService(): ErrorService {
  if (!errorService) {
    throw new Error(
      "Error service not initialized. Call configureMockErrors() in development or a vendor configure helper (e.g. configureSentry()) in production.",
    );
  }
  return errorService;
}

/**
 * Also send every reported error (client errors, CSP violations) to `sink`,
 * e.g. the ops issues DB while Sentry stays the error service. The
 * reported-error counterpart of `addErrorCollector` for server errors.
 */
export function addReportedErrorSink(sink: ReportedErrorSink): void {
  sinks.push(sink);
}

/**
 * Record a browser-reported error with the error service and every sink.
 * Routes that ingest reports call this rather than
 * `getErrorService().recordReportedError` so sinks see them too. A failing
 * sink is logged and skipped.
 */
export function reportError(input: ReportedErrorInput): ReportedErrorRecord {
  const record = getErrorService().recordReportedError(input);
  for (const sink of sinks) {
    try {
      sink(input);
    } catch (e) {
      console.error("errors-service: reported-error sink failed", e);
    }
  }
  return record;
}

/** Test-only: clear the process-level service so configure / set can run again. */
export function resetErrorServiceForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetErrorServiceForTests is only available in test");
  }
  errorService = undefined;
  sinks.length = 0;
}
