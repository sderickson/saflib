import type { Handler } from "express";
import { typedEnv } from "@saflib/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Require a non-simple header on state-changing requests so cross-site form POSTs
 * cannot mutate state (browser same-origin policy blocks setting custom headers).
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

    const xrw = req.headers["x-requested-with"];
    const ok =
      typeof xrw === "string" && xrw.toLowerCase() === "xmlhttprequest";

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
