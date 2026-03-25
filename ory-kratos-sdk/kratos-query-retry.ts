import { isKratosFlowGoneError } from "./kratos-http-error.ts";

/** TanStack Query `retry` callback: do not retry expired Kratos flows (HTTP 410). */
export function kratosFlowQueryRetry(failureCount: number, error: unknown): boolean {
  if (isKratosFlowGoneError(error)) return false;
  return failureCount < 3;
}
