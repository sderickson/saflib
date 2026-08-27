/** Secret was not found (e.g. SDK 404). */
export class InfisicalNotFoundError extends Error {
  constructor(message = "Secret not found") {
    super(message);
    this.name = "InfisicalNotFoundError";
  }
}

/** Unauthorized — invalid or missing token (e.g. SDK 401/403). */
export class InfisicalUnauthorizedError extends Error {
  constructor(message = "Infisical authentication failed") {
    super(message);
    this.name = "InfisicalUnauthorizedError";
  }
}

/** Network or request failure (e.g. connection refused, timeout). */
export class InfisicalNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "InfisicalNetworkError";
  }
}

/** Union of Infisical client errors for `ReturnsError` and exhaustive switches. */
export type InfisicalClientError =
  | InfisicalNotFoundError
  | InfisicalUnauthorizedError
  | InfisicalNetworkError;

/**
 * Maps a thrown SDK error to an InfisicalClientError.
 * Infisical SDK throws errors with message containing [StatusCode=N].
 */
export function mapSdkError(err: unknown): InfisicalClientError {
  const message = err instanceof Error ? err.message : String(err);
  const statusMatch = message.match(/\[StatusCode=(\d+)\]/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

  if (statusCode === 404) {
    return new InfisicalNotFoundError(message);
  }
  if (statusCode === 401 || statusCode === 403) {
    return new InfisicalUnauthorizedError(message);
  }

  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code: string }).code
      : null;
  const isNetwork =
    statusCode == null &&
    (code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      /network|timeout|ECONNREFUSED|ETIMEDOUT/i.test(message));

  if (isNetwork) {
    return new InfisicalNetworkError(message, { cause: err });
  }

  return new InfisicalNetworkError(message, { cause: err });
}
