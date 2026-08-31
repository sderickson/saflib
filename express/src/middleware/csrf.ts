import type { Handler } from "express";
import { typedEnv } from "@saflib/env";
import {
  OPENAPI_TAG_CSRF_EXEMPT,
  OPENAPI_TAG_NO_AUTH,
} from "@saflib/openapi";
import { isInternalRequest } from "../markInternal.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enforce CSRF double-submit token validation on state-changing requests.
 *
 * Must run after OpenAPI validation has matched an operation (`req.openapi.schema`).
 * Missing schema on an unsafe method is a misconfiguration (500), not a skip —
 * otherwise `no-auth` / `csrf-exempt` tags cannot be trusted.
 *
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

    const method = req.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
      return next();
    }

    if (!req.openapi?.schema) {
      next(
        new Error(
          "CSRF middleware requires a matched OpenAPI operation (mount createScopedMiddleware with apiSpec before CSRF)",
        ),
      );
      return;
    }

    const tags = req.openapi.schema.tags;
    if (
      tags?.includes(OPENAPI_TAG_NO_AUTH) ||
      tags?.includes(OPENAPI_TAG_CSRF_EXEMPT)
    ) {
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
