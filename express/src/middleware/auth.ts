import type { Handler } from "express";
import { getSafContext } from "@saflib/node";
import {
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk/auth-error-codes";

interface AuthMiddlewareOptions {
  adminRequired?: boolean;
  /** When true, respond with 403 unless `auth.emailVerified` is true. */
  emailVerificationRequired?: boolean;
  /**
   * When true, respond with 403 unless the session meets MFA (AAL2+).
   * Admin routes also require MFA via `adminRequired`.
   */
  mfaRequired?: boolean;
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
    const routeRequiresVerifiedEmail =
      Boolean(emailVerificationRequired) ||
      tags?.includes("email-verified") === true ||
      Boolean(adminRequired);

    const routeRequiresMfa =
      Boolean(mfaRequired) ||
      tags?.includes("mfa-required") === true ||
      Boolean(adminRequired);

    if (tags?.includes("no-auth")) {
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

    if (adminRequired && !auth.isAdmin) {
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
