import { recordReportedError } from "@saflib/errors-sdk";
import type { ErrorsRequestBody } from "@saflib/errors-spec";

export interface ClientErrorReporterOptions {
  /** API subdomain (typically `api`). */
  subdomain?: string;
  /** SPA or client name recorded as `source`. */
  source?: string;
}

function errorToReportedError(
  error: unknown,
  source: string,
): ErrorsRequestBody["recordReportedError"]["reportedError"] {
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

/**
 * POST a client error to the backend ring buffer (best-effort).
 */
export async function reportClientErrorToBackend(
  error: unknown,
  options: ClientErrorReporterOptions = {},
): Promise<void> {
  const subdomain = options.subdomain ?? "api";
  const source = options.source ?? "client";
  try {
    await recordReportedError(subdomain, {
      reportedError: errorToReportedError(error, source),
    });
  } catch (reportError) {
    console.error("Failed to record client error to backend", reportError);
  }
}
