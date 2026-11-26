import type { Handler } from "express";
import morgan from "morgan";
import { formatHttpAccessLine } from "@saflib/node";
import { getSafReporters, type SafReporters } from "@saflib/node";
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
 * Persists one `http`-level line per request when it finishes: method, the
 * route template (never the raw path, which can hold ids and tokens),
 * status, duration and whether it was an internal call. The line carries the
 * request's context, so the logs UI can show it as the head of the request's
 * group. Runs after route matching and context setup (scoped middleware).
 *
 * Also warns when a changing request has no OpenAPI operation id.
 */
export const makeRequestLineLogger =
  (getReporters: () => Pick<SafReporters, "log"> = getSafReporters): Handler =>
  (req, res, next) => {
    const start = process.hrtime.bigint();
    // Reporters are bound to this request's context now; the finish event
    // fires outside it.
    const { log } = getReporters();
    const operationId = req.openapi?.schema?.operationId;
    // Operations that read the logs (and would flood them when polled) opt
    // out in their OpenAPI fragment.
    const skip =
      (req.openapi?.schema as Record<string, unknown> | undefined)?.[
        "x-skip-request-log"
      ] === true;
    res.on("finish", () => {
      const route = req.openapi?.openApiRoute ?? "(unmatched)";
      if (skip) return;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      log.http(`${req.method} ${route}`, {
        method: req.method,
        route,
        status: res.statusCode,
        duration_ms: Math.round(durationMs * 10) / 10,
        internal: isInternalRequest(req),
      });
      if (!operationId && req.method && !safeMethods.includes(req.method)) {
        log.warn("Unknown operation name", {
          method: req.method,
          route,
          status: res.statusCode,
        });
      }
    });
    next();
  };

export const requestLineLogger: Handler = makeRequestLineLogger();

/** @deprecated Use {@link requestLineLogger}, which also does this. */
export const unsafeRequestLogger: Handler = requestLineLogger;
