import type { Handler } from "express";
import { typedEnv } from "@saflib/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enforce CSRF double-submit token validation on state-changing requests.
 * Skips routes tagged `no-auth` (same convention as auth middleware).
 */
export const makeCsrfMiddleware = (): Handler => {
  return (req, res, next): void => {
    if (typedEnv.NODE_ENV === "test") {
      return next();
    }

    if (req.openapi?.schema?.tags?.includes("no-auth")) {
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
