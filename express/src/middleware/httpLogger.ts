import type { Handler } from "express";
import morgan from "morgan";
import { getSafReporters } from "@saflib/node";

/**
 * HTTP request logging middleware using Morgan.
 * Mainly used for debugging in development, not propagated to something like Loki in production.
 * Format: ":date[iso] <:id> :method :url :status :response-time ms - :res[content-length]"
 */
export const everyRequestLogger: Handler = (() => {
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

const safeMethods = ["GET", "HEAD", "OPTIONS"];

/**
 * For tracking requests which are "unsafe", that is they make some sort of change.
 * These are logged to Loki or whatever transport Winston is hooked up to.
 * They use OpenAPI operationIds to help label the request; these should always be set.
 */
export const unsafeRequestLogger: Handler = (req, res, next) => {
  if (req.method && safeMethods.includes(req.method)) {
    return next();
  }

  const { log } = getSafReporters();
  const operationName = req.openapi?.schema?.operationId || "unknown";
  res.on("finish", () => {
    log.info("Request finished", {
      operationName,
      method: req.method,
      originalUrl: req.originalUrl,
      status: res.statusCode,
    });
    if (operationName === "unknown") {
      log.warn("Unknown operation name", {
        method: req.method,
        originalUrl: req.originalUrl,
        status: res.statusCode,
      });
    }
  });

  next();
};
