/** A short summary of an error's cause, e.g. `ENOTFOUND api.example.com`. */
function causeSummary(cause: unknown): string | null {
  if (!cause || typeof cause !== "object") return typeof cause === "string" ? cause : null;
  const c = cause as { code?: unknown; message?: unknown; hostname?: unknown; address?: unknown; port?: unknown };
  const code = typeof c.code === "string" ? c.code : null;
  const where =
    typeof c.hostname === "string"
      ? c.hostname
      : typeof c.address === "string"
        ? `${c.address}${typeof c.port === "number" ? `:${c.port}` : ""}`
        : null;
  if (code && where) return `${code} ${where}`;
  if (code) return code;
  return typeof c.message === "string" && c.message ? c.message.slice(0, 200) : null;
}

/**
 * The message and stack to record for an error, with its `cause` chain.
 *
 * Network errors from Node's `fetch` say only "fetch failed"; the reason
 * (DNS, refused connection, TLS) is in `cause`, and their frames are all
 * Node-internal, so under strip-types their stack has none. The cause goes
 * in the title (`fetch failed (ENOTFOUND api.example.com)`) and each cause's
 * stack under "Caused by:".
 */
export function describeError(error: Error): { message: string; stack: string | undefined } {
  const summary = causeSummary((error as { cause?: unknown }).cause);
  const message = summary && !error.message.includes(summary) ? `${error.message} (${summary})` : error.message;
  let stack = error.stack;
  if (stack && !/\n\s+at /.test(stack)) {
    stack += "\n    (no stack frames: the error was raised inside Node, e.g. by fetch; see the operation and cause)";
  }
  let cause: unknown = (error as { cause?: unknown }).cause;
  for (let depth = 0; cause && depth < 3; depth++) {
    const text =
      cause instanceof Error
        ? (cause.stack ?? `${cause.name}: ${cause.message}`)
        : typeof cause === "object"
          ? JSON.stringify(cause).slice(0, 500)
          : String(cause);
    const code = typeof (cause as { code?: unknown }).code === "string" ? ` [${(cause as { code: string }).code}]` : "";
    stack = `${stack ?? `${error.name}: ${error.message}`}\nCaused by${code}: ${text}`;
    cause = (cause as { cause?: unknown }).cause;
  }
  return { message, stack };
}
