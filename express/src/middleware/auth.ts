import type { Handler } from "express";
import { getSafContext } from "@saflib/node";

interface AuthMiddlewareOptions {
  adminRequired?: boolean;
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
  const { adminRequired } = options;

  return (req, res, next): void => {
    const { auth } = getSafContext();

    if (req.openapi?.schema?.tags?.includes("no-auth")) {
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

    if (adminRequired && !auth.userScopes.includes("*")) {
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

    return next();
  };
};
