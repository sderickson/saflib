import type { Handler } from "express";
import createError from "http-errors";

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: number;
        userEmail: string;
        scopes: string[];
      };
    }
  }
}

/**
 * Middleware that adds user information from headers to the request object.
 * Expects x-user-id, x-user-email, and x-user-scopes headers to be set by authentication layer.
 * Throws 401 if required headers are missing.
 */
export const auth: Handler = (req, _res, next): void => {
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];
  const userScopes = req.headers["x-user-scopes"];

  if (!userId || !userEmail) {
    return next(createError(401, "Unauthorized"));
  }

  // Parse scopes from header, defaulting to empty array if not present
  const scopes = userScopes ? (userScopes as string).split(",") : [];

  req.auth = {
    userId: parseInt(userId as string),
    userEmail: userEmail as string,
    scopes,
  };

  return next();
};
