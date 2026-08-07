import type { Handler } from "express";
import { typedEnv } from "@saflib/env";
import { isInternalRequest } from "../markInternal.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enforce CSRF double-submit token validation on state-changing requests.
 * Skips routes tagged `no-auth` (same convention as auth middleware).
 * Skips `csrf-exempt` for browser-initiated posts that cannot attach our token
 * (e.g. Content-Security-Policy violation reports).
 * Skips internal-listener traffic (assertion-authenticated unix socket); CSRF
 * protects browser cookie sessions, not in-process/service hops.
 */
export const makeCsrfMiddleware = (): Handler => {
  return (req, res, next): void => {
    if (typedEnv.NODE_ENV === "test") {
      return next();
    }

    if (isInternalRequest(req)) {
      return next();
    }

    const tags = req.openapi?.schema?.tags;
    if (tags?.includes("no-auth") || tags?.includes("csrf-exempt")) {
      return next();
    }

    const method = req.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
      return next();
    }

    const ok =
      typeof req.isValidCsrfToken === "function" && req.isValidCsrfToken();

    if (!ok) {
      if (!res.headersSent) {
        res.status(403).json({
          error: "Forbidden",
          message: "CSRF validation failed",
        });
      }
      return;
    }

    return next();
  };
};
