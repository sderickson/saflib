import type { Handler } from "express";
import morgan from "morgan";

/**
 * HTTP request logging middleware using Morgan.
 * Includes request ID in the log output for request tracing.
 * Format: ":date[iso] <:id> :method :url :status :response-time ms - :res[content-length]"
 */
export const httpLogger: Handler = (() => {
  if (process.env.NODE_ENV === "test") {
    return (_, __, next) => next();
  }

  // Define custom token for request ID
  morgan.token("id", (req) => (req as any).shortId);

  // Return configured morgan middleware
  return morgan(
    ":date[iso] <:id> :method :url :status :response-time ms - :res[content-length]",
  );
})();
