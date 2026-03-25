import type { ErrorBrowserLocationChangeRequired, RecoveryFlow } from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { isAxiosError } from "axios";

/**
 * Kratos JSON response for HTTP 422 when the browser must navigate to `redirect_browser_to`
 * (no `ui` on the body — distinct from validation errors that return a full flow).
 */
export class TanstackErrorBrowserLocationChangeRequired extends TanstackError {
  readonly payload: ErrorBrowserLocationChangeRequired;

  constructor(status: number, payload: ErrorBrowserLocationChangeRequired) {
    super(status, "browser_location_change_required");
    this.name = "TanstackErrorBrowserLocationChangeRequired";
    this.payload = payload;
  }
}

/** Kratos returned an updated recovery flow in the error body (e.g. HTTP 400 validation). */
export class TanstackErrorKratosRecoveryValidation extends TanstackError {
  readonly payload: RecoveryFlow;

  constructor(status: number, payload: RecoveryFlow) {
    super(status, "recovery_validation");
    this.name = "TanstackErrorKratosRecoveryValidation";
    this.payload = payload;
  }
}

function isBrowserLocationChangeBody(d: unknown): d is ErrorBrowserLocationChangeRequired {
  if (!d || typeof d !== "object") return false;
  if ("ui" in d) return false;
  const redirect = (d as ErrorBrowserLocationChangeRequired).redirect_browser_to;
  return typeof redirect === "string" && redirect.trim().length > 0;
}

function isRecoveryFlowBody(d: unknown): d is RecoveryFlow {
  return typeof d === "object" && d !== null && "ui" in d && "id" in d;
}

function kratosErrorCodeFromBody(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const err = (data as { error?: { id?: string } }).error;
  return typeof err?.id === "string" ? err.id : undefined;
}

/** Map an Axios error from recovery flow APIs into {@link TanstackError} subclasses (or plain {@link TanstackError}). */
export function throwKratosRecoveryAxiosError(e: unknown): never {
  if (e instanceof TanstackError) throw e;
  if (!isAxiosError(e)) throw new TanstackError(0, "unknown");
  const status = e.response?.status ?? 0;
  const data = e.response?.data;
  if (isBrowserLocationChangeBody(data)) {
    throw new TanstackErrorBrowserLocationChangeRequired(status, data);
  }
  if (isRecoveryFlowBody(data)) {
    throw new TanstackErrorKratosRecoveryValidation(status, data);
  }
  throw new TanstackError(status, kratosErrorCodeFromBody(data));
}
