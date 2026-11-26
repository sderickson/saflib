import { recordReportedError, reportClientError } from "@saflib/errors-sdk";
import type { ErrorsRequestBody } from "@saflib/errors-spec";

export interface ClientErrorReporterOptions {
  /** SPA or client name recorded as `source`. */
  source?: string;
  /** Vue errorHandler `info` (component lifecycle hook name, etc.). */
  info?: string;
}

function errorToReportedError(
  error: unknown,
  source: string,
): ErrorsRequestBody["recordReportedError"]["reported_error"] {
  if (error instanceof Error) {
    return {
      kind: "client",
      message: error.message.slice(0, 2000),
      stack: error.stack?.slice(0, 8000),
      source,
    };
  }
  return {
    kind: "client",
    message: String(error).slice(0, 2000),
    source,
  };
}

/** True when the browser host is a local/dev domain (`localhost` or `*.localhost`). */
export function isLocalhostHostname(
  hostname: string = globalThis.location?.hostname ?? "",
): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

/**
 * Always `console.error`s, then reports the error so it becomes an issue: on
 * local dev hosts to `POST /errors/record` (no session needed), elsewhere to
 * `POST /errors/report` (signed-in users only; anonymous reports are
 * dropped by the server).
 */
export async function reportClientErrorToBackend(
  error: unknown,
  options: ClientErrorReporterOptions = {},
): Promise<void> {
  if (options.info) {
    console.error(`[vue] ${options.info}`, error);
  } else {
    console.error(error);
  }

  const source = options.source ?? "client";
  const body = { reported_error: errorToReportedError(error, source) };
  try {
    if (isLocalhostHostname()) {
      await recordReportedError(body);
    } else {
      await reportClientError(body);
    }
  } catch {
    // Reporting is best-effort; signed-out users get a 401 here by design.
  }
}

let rejectionsInstalled = false;

/**
 * Report promise rejections nobody handled (they never reach Vue's
 * errorHandler). Idempotent: installs one window listener per page.
 */
export function reportUnhandledRejections(source: string): void {
  if (rejectionsInstalled || typeof window === "undefined") return;
  rejectionsInstalled = true;
  window.addEventListener("unhandledrejection", (event) => {
    void reportClientErrorToBackend(event.reason, { source, info: "unhandledrejection" });
  });
}
