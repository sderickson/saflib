import type { HttpHandler } from "msw";
import { setupMockServer } from "@saflib/sdk/testing/mock";

/**
 * Scaffold copy of the service SDK `testing.ts` pattern — one MSW handler per test file.
 */
export function setupScopedMockServer(handlers: HttpHandler | HttpHandler[]) {
  setupMockServer(Array.isArray(handlers) ? handlers : [handlers]);
}

export const withScopedFakeHandlers = setupScopedMockServer;
