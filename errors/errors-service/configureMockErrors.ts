import { setErrorService, hasErrorService } from "./configureErrors.ts";
import { createErrorService } from "./createErrorService.ts";

/**
 * Wire the in-memory mock error service for local development and tests.
 * Idempotent — subsequent calls are no-ops.
 */
export function configureMockErrors(): void {
  if (hasErrorService()) {
    return;
  }
  setErrorService(createErrorService({ type: "in-memory" }));
}
