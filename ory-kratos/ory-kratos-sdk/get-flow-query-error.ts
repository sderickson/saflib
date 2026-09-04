import type { GenericError } from "@ory/client";
import { isAxiosError } from "axios";
import {
  FlowGone,
  SecurityCsrfViolation,
  UnhandledResponse,
} from "./flow-results.ts";

/** Kratos JSON body shape for CSRF security errors (browser flows). */
export function isKratosSecurityCsrfResponseBody(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const err = (data as { error?: { id?: string } }).error;
  return err?.id === "security_csrf_violation";
}

/**
 * Maps GET self-service flow errors to typed results for TanStack query `queryFn`.
 * Returns `undefined` if the error should propagate (e.g. 5xx → TanstackError).
 */
export function resultFromKratosGetFlowHttpError(
  e: unknown,
): FlowGone | SecurityCsrfViolation | UnhandledResponse | undefined {
  if (!isAxiosError(e) || !e.response) return undefined;
  const { status, data } = e.response;
  if (status === 410) {
    return new FlowGone(data as GenericError);
  }
  if (status === 403 && isKratosSecurityCsrfResponseBody(data)) {
    return new SecurityCsrfViolation(data);
  }
  if (status >= 400 && status < 500) {
    return new UnhandledResponse(status, data);
  }
  return undefined;
}
