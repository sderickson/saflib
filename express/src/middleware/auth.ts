import type { Handler } from "express";
import { getSafContext } from "@saflib/node";

interface AuthMiddlewareOptions {
  adminRequired?: boolean;
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
      res.status(401).json({
        error: "Unauthorized",
        message: "Unauthorized",
      });
      return;
    }

    if (adminRequired && !auth.userScopes.includes("*")) {
      res.status(403).json({
        error: "Forbidden",
        message: "Forbidden",
      });
      return;
    }

    return next();
  };
};
