/**
 * Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class.
 */
export class TanstackError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, code?: string) {
    super("Network error caught by Tanstack");
    this.status = status;
    this.code = code;
  }
}

/**
 * Returns a human-readable error message based on the TanstackError status code.
 */
export function getTanstackErrorMessage(
  error: TanstackError | undefined
): string {
  if (!error) return "";
  switch (error.status) {
    case 400:
      return "Bad Request - The request was invalid or malformed";
    case 401:
      return "Unauthorized - Authentication is required";
    case 403:
      return "Forbidden - You don't have permission to access this resource";
    case 404:
      return "Not Found - The requested resource was not found";
    case 409:
      return "Conflict - The request conflicts with the current state of the resource";
    case 429:
      return "Too Many Requests - Rate limit exceeded, please try again later";
    default:
      if (error.status >= 500) {
        return "Server Error - Something went wrong on our end, please try again later";
      }
      return "Unknown Error - An unexpected error occurred";
  }
}
