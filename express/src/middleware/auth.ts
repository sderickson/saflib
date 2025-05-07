import type { Handler } from "express";
import { safContext } from "@saflib/node";
export interface Auth {
  userId: number;
  userEmail: string;
  scopes: string[];
}

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      /**
       * @deprecated - use `{ auth } = safContext.getStore()` instead. safContext is imported from `@saflib/node`
       */
      auth: Auth;
    }
  }
}

/**
 * Middleware that adds user information from headers to the request object.
 * Expects x-user-id, x-user-email, and x-user-scopes headers to be set by authentication layer.
 * Throws 401 if required headers are missing.
 */
export const auth: Handler = (req, res, next): void => {
  const { auth } = safContext.getStore()!;

  if (!auth) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Unauthorized",
    });
    return;
  }

  req.auth = auth;

  return next();
};
