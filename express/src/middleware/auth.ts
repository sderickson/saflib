import type { Handler } from "express";
import { getSafContext } from "@saflib/node";
import {
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/utils/auth-error-codes";
import { typedEnv } from "../../env.ts";

/**
 * Session requirements. Routes get these from OpenAPI `security` via the
 * built-in `session` resolver (`site-admin`, `email-verified`, `mfa` scopes).
 */
export interface AuthMiddlewareOptions {
  /** Require a site admin; implies verified email + MFA. */
  adminRequired?: boolean;
  /** When true, respond with 403 unless `auth.emailVerified` is true. */
  emailVerificationRequired?: boolean;
  /** When true, respond with 403 unless the session meets MFA (AAL2+). */
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
    const routeRequiresSiteAdmin = Boolean(adminRequired);

    const routeRequiresVerifiedEmail =
      Boolean(emailVerificationRequired) || routeRequiresSiteAdmin;

    const routeRequiresMfa =
      isMfaEnforcementEnabled() &&
      (Boolean(mfaRequired) || routeRequiresSiteAdmin);

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
