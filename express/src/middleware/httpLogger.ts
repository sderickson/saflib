import type { Handler } from "express";
import morgan from "morgan";
import { formatHttpAccessLine } from "@saflib/node";
import { getSafReporters } from "@saflib/node";
import { typedEnv } from "@saflib/env";
import { isInternalRequest } from "../markInternal.ts";

/**
 * HTTP request logging middleware using Morgan.
 * Mainly used for debugging in development, not propagated to something like Loki in production.
 *
 * Channel markers (4-char column, asymmetric weight + direction):
 * - `◀━━ ` browser/client — bold in development (heavy bar, inbound from the left)
 * - ` ──▷` internal background — dim in development (light bar, outbound to the right)
 */
export const everyRequestLogger: Handler = (() => {
  if (typedEnv.NODE_ENV === "test") {
    return (_, __, next) => next();
  }

  return morgan((tokens, req, res) => {
    const method = tokens.method(req, res) ?? "-";
    const url = tokens.url(req, res) ?? "-";
    const status = tokens.status(req, res);
    const responseTime = tokens["response-time"](req, res);
    const durationMs = Number(responseTime ?? 0);
    const contentLength = res.getHeader("content-length");

    return formatHttpAccessLine({
      internal: isInternalRequest(req),
      status: status ? Number(status) : undefined,
      durationMs,
      sizeBytes:
        contentLength == null
          ? undefined
          : typeof contentLength === "number"
            ? contentLength
            : String(contentLength),
      method,
      url,
    });
  });
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
  const operationName =
    req.openapi?.schema?.operationId ?? req.openapi?.openApiRoute ?? "unknown";
  res.on("finish", () => {
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
