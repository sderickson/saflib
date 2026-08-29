import type { Handler } from "express";
import { getSafContext } from "@saflib/node";
import {
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/utils/auth-error-codes";
import {
  OPENAPI_TAG_EMAIL_VERIFIED,
  OPENAPI_TAG_MFA_REQUIRED,
  OPENAPI_TAG_NO_AUTH,
  OPENAPI_TAG_SITE_ADMIN_ONLY,
} from "@saflib/openapi";
import { typedEnv } from "../../env.ts";

export interface AuthMiddlewareOptions {
  /**
   * @deprecated Prefer the OpenAPI `site-admin-only` tag. Kept for callers that
   * do not run OpenAPI validation middleware.
   */
  adminRequired?: boolean;
  /** When true, respond with 403 unless `auth.emailVerified` is true. */
  emailVerificationRequired?: boolean;
  /**
   * When true, respond with 403 unless the session meets MFA (AAL2+).
   * Site-admin routes also require MFA via the `site-admin-only` tag.
   */
  mfaRequired?: boolean;
}

function isMfaEnforcementEnabled(): boolean {
  return typedEnv.DISABLE_MFA_ENFORCEMENT !== "true";
}

function forbiddenPayload(code: string) {
  return {
    error: "Forbidden",
    message: "Forbidden",
    code,
  };
}

/**
 * Drain the request body so the client can finish sending (e.g. multipart
 * upload). Call before sending 401/403 to avoid EPIPE when the client closes
 * after receiving the response while the body was still streaming.
 */
export function drainRequest(req: import("express").Request): Promise<void> {
  return new Promise((resolve) => {
    if (req.complete) {
      resolve();
      return;
    }
    req.once("end", resolve);
    req.once("error", resolve);
    req.resume();
  });
}

export const makeAuthMiddleware = (
  options: AuthMiddlewareOptions = {},
): Handler => {
  const { adminRequired, emailVerificationRequired, mfaRequired } = options;

  return (req, res, next): void => {
    const { auth } = getSafContext();
    const tags = req.openapi?.schema?.tags;
    const routeRequiresSiteAdmin =
      tags?.includes(OPENAPI_TAG_SITE_ADMIN_ONLY) === true ||
      Boolean(adminRequired);

    const routeRequiresVerifiedEmail =
      Boolean(emailVerificationRequired) ||
      tags?.includes(OPENAPI_TAG_EMAIL_VERIFIED) === true ||
      routeRequiresSiteAdmin;

    const routeRequiresMfa =
      isMfaEnforcementEnabled() &&
      (Boolean(mfaRequired) ||
        tags?.includes(OPENAPI_TAG_MFA_REQUIRED) === true ||
        routeRequiresSiteAdmin);

    if (tags?.includes(OPENAPI_TAG_NO_AUTH)) {
      return next();
    }

    if (!auth) {
      drainRequest(req).then(() => {
        if (!res.headersSent) {
          res.status(401).json({
            error: "Unauthorized",
            message: "Unauthorized",
          });
        }
      });
      return;
    }

    if (routeRequiresVerifiedEmail && auth.emailVerified !== true) {
      drainRequest(req).then(() => {
        if (!res.headersSent) {
          res
            .status(403)
            .json(forbiddenPayload(AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED));
        }
      });
      return;
    }

    if (routeRequiresSiteAdmin && !auth.isAdmin) {
      drainRequest(req).then(() => {
        if (!res.headersSent) {
          res.status(403).json({
            error: "Forbidden",
            message: "Forbidden",
          });
        }
      });
      return;
    }

    if (routeRequiresMfa && auth.mfaCompleted !== true) {
      drainRequest(req).then(() => {
        if (!res.headersSent) {
          res.status(403).json(forbiddenPayload(AUTH_ERROR_MFA_REQUIRED));
        }
      });
      return;
    }

    return next();
  };
};
