import { recordReportedError } from "@saflib/errors-sdk";
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
      message: error.message,
      stack: error.stack,
      source,
    };
  }
  return {
    kind: "client",
    message: String(error),
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
 * Always `console.error`s. POSTs to the backend ring buffer only on localhost
 * hosts (e.g. `daemon/dev`, `deploy` prod-local) — not production.
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

  if (!isLocalhostHostname()) {
    return;
  }

  const source = options.source ?? "client";
  try {
    await recordReportedError({
      reported_error: errorToReportedError(error, source),
    });
  } catch (reportError) {
    console.error("Failed to record client error to backend", reportError);
  }
}
