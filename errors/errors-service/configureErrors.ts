import type { ErrorService } from "./types.ts";

let errorService: ErrorService | undefined;

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

/** Test-only: clear the process-level service so configure / set can run again. */
export function resetErrorServiceForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetErrorServiceForTests is only available in test");
  }
  errorService = undefined;
}
